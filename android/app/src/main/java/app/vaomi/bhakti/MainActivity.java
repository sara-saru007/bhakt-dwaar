package app.vaomi.bhakti;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register custom screen analyzer plugin for dark-screen detection
        registerPlugin(ScreenAnalyzerPlugin.class);

        // Dark background to prevent white/blue flash between system splash and WebView load
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.parseColor("#0D0200")));
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Dark background on WebView to match app theme (no flash)
        webView.setBackgroundColor(Color.parseColor("#0D0200"));

        // Chrome user-agent so YouTube embeds work in WebView
        String defaultAgent = settings.getUserAgentString();
        settings.setUserAgentString(defaultAgent + " Chrome/120.0.0.0");

        // Increase font size by 15% across the whole app
        settings.setTextZoom(115);

        // Allow media autoplay without user gesture (needed for unmuted default)
        settings.setMediaPlaybackRequiresUserGesture(false);

        // Hardware acceleration for smooth video
        webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);

        // JavaScript and DOM storage (required for YouTube IFrame API)
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
    }
}
