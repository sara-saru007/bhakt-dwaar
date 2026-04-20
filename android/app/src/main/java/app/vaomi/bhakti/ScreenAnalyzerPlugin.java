package app.vaomi.bhakti;

import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Rect;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.view.PixelCopy;
import android.view.Window;
import android.webkit.WebView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Captures a perceptual hash of the video region on screen.
 * Two calls 30-40 seconds apart with identical hashes = visually static stream.
 *
 * Fix over old plugin: uses a dedicated HandlerThread for PixelCopy callback
 * instead of Looper.getMainLooper() (which caused the callback to never fire
 * because the UI thread was already blocked waiting for runOnUiThread).
 */
@CapacitorPlugin(name = "ScreenAnalyzer")
public class ScreenAnalyzerPlugin extends Plugin {

    // Header height in dp (must match HEADER_H in TempleStream.jsx)
    private static final int HEADER_DP = 60;

    @PluginMethod
    public void captureHash(final PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            // PixelCopy requires API 26+
            resolve(call, "unsupported");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                Window window = getActivity().getWindow();
                WebView webView = getBridge().getWebView();

                int[] loc = new int[2];
                webView.getLocationOnScreen(loc);

                int vw = webView.getWidth();
                float density = getContext().getResources().getDisplayMetrics().density;
                int headerPx = (int) (HEADER_DP * density);
                int videoH   = (int) (vw * 0.5625f); // 16:9

                int left   = loc[0];
                int top    = loc[1] + headerPx;
                int right  = left + vw;
                int bottom = top  + videoH;

                // Clamp to window bounds
                android.util.DisplayMetrics dm = new android.util.DisplayMetrics();
                getActivity().getWindowManager().getDefaultDisplay().getRealMetrics(dm);
                right  = Math.min(right,  dm.widthPixels);
                bottom = Math.min(bottom, dm.heightPixels);

                int captureW = right - left;
                int captureH = bottom - top;

                if (captureW <= 0 || captureH <= 0) {
                    resolve(call, "zero");
                    return;
                }

                Bitmap bitmap = Bitmap.createBitmap(captureW, captureH, Bitmap.Config.ARGB_8888);
                Rect srcRect  = new Rect(left, top, right, bottom);

                // Use a background thread for the callback — main thread must stay free
                HandlerThread thread = new HandlerThread("PixelCopyThread");
                thread.start();

                PixelCopy.request(window, srcRect, bitmap, copyResult -> {
                    thread.quitSafely();
                    if (copyResult != PixelCopy.SUCCESS) {
                        bitmap.recycle();
                        resolve(call, "fail:" + copyResult);
                        return;
                    }
                    try {
                        // 8×8 deterministic grid → 64 samples
                        // Quantise channels to 32 levels (>> 3) to absorb encoder noise
                        long hash = 0;
                        for (int row = 1; row <= 8; row++) {
                            for (int col = 1; col <= 8; col++) {
                                int px = captureW * col / 9;
                                int py = captureH * row / 9;
                                if (px < captureW && py < captureH) {
                                    int p = bitmap.getPixel(px, py);
                                    int r = (Color.red(p)   >> 3);
                                    int g = (Color.green(p) >> 3);
                                    int b = (Color.blue(p)  >> 3);
                                    hash = hash * 37L + (r * 1024L + g * 32L + b);
                                }
                            }
                        }
                        bitmap.recycle();
                        JSObject result = new JSObject();
                        result.put("hash", String.valueOf(hash));
                        call.resolve(result);
                    } catch (Exception e) {
                        resolve(call, "err");
                    }
                }, new Handler(thread.getLooper()));

            } catch (Exception e) {
                resolve(call, "err");
            }
        });
    }

    // Legacy method kept so old call-sites don't crash
    @PluginMethod
    public void checkBrightness(final PluginCall call) {
        JSObject r = new JSObject();
        r.put("brightness", 0.5);
        call.resolve(r);
    }

    private void resolve(PluginCall call, String hash) {
        JSObject r = new JSObject();
        r.put("hash", hash);
        call.resolve(r);
    }
}
