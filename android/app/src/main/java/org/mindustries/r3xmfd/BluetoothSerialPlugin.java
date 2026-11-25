package org.mindustries.r3xmfd;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.view.WindowManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Klassisches Bluetooth mit seriellem Profil (SPP/RFCOMM) für Consult-Adapter (HC-05 u. a.).
 * Gleiche Aufgabe wie btconsult.py + der RFCOMM-Teil von consult.py in R34 OS:
 * suchen, mit PIN koppeln, verbinden, Bytes senden/empfangen. Das Consult-Protokoll selbst läuft in TypeScript.
 */
@SuppressLint("MissingPermission")
@CapacitorPlugin(
    name = "BluetoothSerial",
    permissions = {
        @Permission(alias = "bt", strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = "btLegacy", strings = { Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class BluetoothSerialPlugin extends Plugin {
    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    // Namen, die nach Consult-/Seriell-Adapter aussehen (wie btconsult.py)
    private static final Pattern LIKELY = Pattern.compile("consult|hc-?0[56]|obd|r3x|nissan|nds|spp|linvor|serial|blue\\s?sult", Pattern.CASE_INSENSITIVE);

    private BluetoothSocket socket;
    private OutputStream out;
    private Thread reader;
    private String connectedMac = "";
    private final Handler main = new Handler(Looper.getMainLooper());

    private BluetoothAdapter adapter() {
        BluetoothManager m = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        return m == null ? null : m.getAdapter();
    }

    private String alias() { return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? "bt" : "btLegacy"; }

    /** Rechte prüfen; fehlen sie, fragt Android einmal nach und ruft danach permCallback auf. */
    private boolean needPerm(PluginCall call) {
        if (getPermissionState(alias()) == PermissionState.GRANTED) return false;
        requestPermissionForAlias(alias(), call, "permCallback");
        return true;
    }

    @PermissionCallback
    private void permCallback(PluginCall call) {
        if (getPermissionState(alias()) != PermissionState.GRANTED) { call.reject("perm"); return; }
        switch (call.getMethodName()) {
            case "devices": devices(call); break;
            case "pair": pair(call); break;
            case "connect": connect(call); break;
            default: call.reject("?");
        }
    }

    // ---------------- Geräte suchen ----------------
    @PluginMethod
    public void devices(PluginCall call) {
        BluetoothAdapter a = adapter();
        if (a == null) { JSObject r = new JSObject(); r.put("err", "noadapter"); r.put("devices", new JSArray()); call.resolve(r); return; }
        if (needPerm(call)) return;
        if (!a.isEnabled()) { JSObject r = new JSObject(); r.put("err", "off"); r.put("devices", new JSArray()); call.resolve(r); return; }
        final Map<String, JSObject> found = new LinkedHashMap<>();
        Set<BluetoothDevice> bonded = a.getBondedDevices();
        if (bonded != null) for (BluetoothDevice d : bonded) found.put(d.getAddress(), dev(d, true));
        boolean scan = Boolean.TRUE.equals(call.getBoolean("scan", false));
        if (!scan) { call.resolve(list(found)); return; }
        final BroadcastReceiver rx = new BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent i) {
                BluetoothDevice d = i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (d == null || d.getName() == null) return;   // Geräte ohne Namen ausblenden
                if (!found.containsKey(d.getAddress())) found.put(d.getAddress(), dev(d, d.getBondState() == BluetoothDevice.BOND_BONDED));
            }
        };
        register(rx, new IntentFilter(BluetoothDevice.ACTION_FOUND));
        a.cancelDiscovery();
        a.startDiscovery();
        main.postDelayed(() -> {
            try { a.cancelDiscovery(); } catch (Exception ignored) { }
            try { getContext().unregisterReceiver(rx); } catch (Exception ignored) { }
            call.resolve(list(found));
        }, 10000);
    }

    private JSObject dev(BluetoothDevice d, boolean paired) {
        String n = d.getName() == null ? d.getAddress() : d.getName();
        JSObject o = new JSObject();
        o.put("mac", d.getAddress().toUpperCase());
        o.put("name", n);
        o.put("paired", paired);
        o.put("likely", LIKELY.matcher(n).find());
        o.put("connected", d.getAddress().equalsIgnoreCase(connectedMac) && socket != null);
        return o;
    }

    private JSObject list(Map<String, JSObject> m) {
        JSArray arr = new JSArray();
        for (JSObject o : m.values()) arr.put(o);
        JSObject r = new JSObject(); r.put("devices", arr); return r;
    }

    private void register(BroadcastReceiver rx, IntentFilter f) {
        if (Build.VERSION.SDK_INT >= 33) getContext().registerReceiver(rx, f, Context.RECEIVER_EXPORTED);
        else getContext().registerReceiver(rx, f);
    }

    // ---------------- Koppeln mit PIN ----------------
    @PluginMethod
    public void pair(PluginCall call) {
        BluetoothAdapter a = adapter();
        if (a == null) { reply(call, false, "noadapter"); return; }
        if (needPerm(call)) return;
        String mac = call.getString("mac", "");
        final String pin = call.getString("pin", "1234").replaceAll("\\D", "");
        final BluetoothDevice d;
        try { d = a.getRemoteDevice(mac.toUpperCase()); } catch (Exception e) { reply(call, false, "MAC"); return; }
        if (d.getBondState() == BluetoothDevice.BOND_BONDED) { reply(call, true, ""); return; }
        a.cancelDiscovery();
        final boolean[] done = { false };
        final BroadcastReceiver rx = new BroadcastReceiver() {
            @Override public void onReceive(Context c, Intent i) {
                BluetoothDevice x = i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (x == null || !x.getAddress().equalsIgnoreCase(d.getAddress())) return;
                if (BluetoothDevice.ACTION_PAIRING_REQUEST.equals(i.getAction())) {
                    // PIN selbst eintragen (Legacy-Pairing wie bei HC-05); klappt das nicht, zeigt Android den PIN-Dialog
                    try {
                        x.setPin((pin.isEmpty() ? "1234" : pin).getBytes(StandardCharsets.UTF_8));
                        abortBroadcast();
                    } catch (Exception ignored) { }
                } else if (BluetoothDevice.ACTION_BOND_STATE_CHANGED.equals(i.getAction())) {
                    int st = i.getIntExtra(BluetoothDevice.EXTRA_BOND_STATE, BluetoothDevice.ERROR);
                    int prev = i.getIntExtra(BluetoothDevice.EXTRA_PREVIOUS_BOND_STATE, BluetoothDevice.ERROR);
                    if (st == BluetoothDevice.BOND_BONDED) finish(true, "");
                    else if (st == BluetoothDevice.BOND_NONE && prev == BluetoothDevice.BOND_BONDING) {
                        int reason = i.getIntExtra("android.bluetooth.device.extra.REASON", 0);
                        finish(false, reason == 1 ? "pin" : "fail");   // 1 = UNBOND_REASON_AUTH_FAILED
                    }
                }
            }
            private void finish(boolean ok, String msg) {
                if (done[0]) return;
                done[0] = true;
                try { getContext().unregisterReceiver(this); } catch (Exception ignored) { }
                reply(call, ok, msg);
            }
        };
        IntentFilter f = new IntentFilter();
        f.addAction(BluetoothDevice.ACTION_PAIRING_REQUEST);
        f.addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED);
        f.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY - 1);
        register(rx, f);
        if (!d.createBond()) {
            done[0] = true;
            try { getContext().unregisterReceiver(rx); } catch (Exception ignored) { }
            reply(call, false, "fail");
            return;
        }
        main.postDelayed(() -> {
            if (done[0]) return;
            done[0] = true;
            try { getContext().unregisterReceiver(rx); } catch (Exception ignored) { }
            reply(call, d.getBondState() == BluetoothDevice.BOND_BONDED, "timeout");
        }, 30000);
    }

    private void reply(PluginCall call, boolean ok, String msg) {
        JSObject r = new JSObject(); r.put("ok", ok); r.put("msg", ok ? "" : msg); call.resolve(r);
    }

    // ---------------- Verbinden, Senden, Empfangen ----------------
    @PluginMethod
    public void connect(PluginCall call) {
        BluetoothAdapter a = adapter();
        if (a == null) { call.reject("noadapter"); return; }
        if (needPerm(call)) return;
        final String mac = call.getString("mac", "").toUpperCase();
        new Thread(() -> {
            close();
            try {
                BluetoothDevice d = a.getRemoteDevice(mac);
                a.cancelDiscovery();
                BluetoothSocket s;
                try {
                    s = d.createRfcommSocketToServiceRecord(SPP);
                    s.connect();
                } catch (IOException first) {
                    // viele HC-05-Klone melden keinen SPP-Dienst: direkt Kanal 1 öffnen
                    Method m = d.getClass().getMethod("createRfcommSocket", int.class);
                    s = (BluetoothSocket) m.invoke(d, 1);
                    s.connect();
                }
                socket = s;
                out = s.getOutputStream();
                connectedMac = mac;
                startReader(s.getInputStream());
                JSObject r = new JSObject(); r.put("ok", true); call.resolve(r);
            } catch (Exception e) {
                close();
                call.reject("connect: " + e.getMessage());
            }
        }).start();
    }

    private void startReader(final InputStream in) {
        reader = new Thread(() -> {
            byte[] buf = new byte[512];
            try {
                while (!Thread.currentThread().isInterrupted()) {
                    int n = in.read(buf);
                    if (n < 0) break;
                    if (n == 0) continue;
                    JSObject ev = new JSObject();
                    ev.put("b64", Base64.encodeToString(buf, 0, n, Base64.NO_WRAP));
                    notifyListeners("data", ev);
                }
            } catch (IOException ignored) { }
            JSObject ev = new JSObject(); ev.put("connected", false);
            notifyListeners("state", ev);
        });
        reader.setDaemon(true);
        reader.start();
    }

    @PluginMethod
    public void write(PluginCall call) {
        OutputStream o = out;
        if (o == null) { call.reject("closed"); return; }
        try {
            o.write(Base64.decode(call.getString("b64", ""), Base64.DEFAULT));
            o.flush();
            call.resolve();
        } catch (IOException e) {
            call.reject("write: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        close();
        call.resolve();
    }

    private synchronized void close() {
        if (reader != null) { reader.interrupt(); reader = null; }
        try { if (socket != null) socket.close(); } catch (IOException ignored) { }
        socket = null; out = null; connectedMac = "";
    }

    // ---------------- Bildschirm an lassen ----------------
    @PluginMethod
    public void keepAwake(PluginCall call) {
        final boolean on = Boolean.TRUE.equals(call.getBoolean("on", true));
        getActivity().runOnUiThread(() -> {
            if (on) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        close();
        super.handleOnDestroy();
    }
}
