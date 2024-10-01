package io.prosopo.procaptcha

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.os.Message
import android.util.Base64
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.JsResult
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

const val namespace = "procaptcha";

class MainActivity : AppCompatActivity() {

    private class ProcaptchaWebViewClient : WebViewClient() {
        override fun doUpdateVisitedHistory(view: WebView?, url: String?, isReload: Boolean) {
            // do nothing, don't worry about visited links
        }

        override fun onFormResubmission(view: WebView, dontResend: Message, resend: Message) {
            // just resend the message, don't bother the user
            resend.sendToTarget()
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?
        ) {
            // TODO this is triggered whenever a resource can't load, bundle/img/whatever etc. Handle the type and display corresponding error
            // handle http + ssl errors here to maintain compatibility with old android versions
            super.onReceivedError(view, request, error)
        }

        override fun shouldOverrideUrlLoading(
            view: WebView,
            request: WebResourceRequest
        ): Boolean {
            Log.i(namespace, "opening external url: ${request.url}")
            // Open URLs in external browser
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(request.url.toString()))
            view.context.startActivity(intent)
            return true
        }

    }

    private class ProcaptchaWebChromeClient : WebChromeClient() {

        override fun getVisitedHistory(callback: ValueCallback<Array<String>>) {
            // call the callback with empty history, making all links appear unvisited
            callback.onReceiveValue(emptyArray())
        }

        override fun onCloseWindow(window: WebView) {
            // don't close any windows associated with the webview
        }

        override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
            val message = "File: ${consoleMessage.sourceId()}\nLine: ${consoleMessage.lineNumber()}\nMessage: ${consoleMessage.message()}"
            when (consoleMessage.messageLevel()) {
                ConsoleMessage.MessageLevel.ERROR -> Log.e(
                    namespace,
                    message
                )
                ConsoleMessage.MessageLevel.WARNING -> Log.w(
                    namespace,
                    message
                    )
                ConsoleMessage.MessageLevel.DEBUG -> Log.d(
                    namespace,
                    message
                )
                else -> Log.i(namespace, message)
            }
            return true; // suppress default logging
        }

        override fun onCreateWindow(
            view: WebView?,
            isDialog: Boolean,
            isUserGesture: Boolean,
            resultMsg: Message?
        ): Boolean {
            val result = super.onCreateWindow(view, isDialog, isUserGesture, resultMsg)
            if(!result) {
                Log.e(namespace, "webview creation failed")
            }
            return result
        }

        override fun onPermissionRequest(request: PermissionRequest?) {
            // TODO handle permissions
            super.onPermissionRequest(request)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val webView = findViewById<WebView>(R.id.webView)
        WebView.setWebContentsDebuggingEnabled(false)
        webView.settings.javaScriptEnabled = true
        webView.settings.useWideViewPort = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.allowFileAccess = true
        webView.webViewClient = ProcaptchaWebViewClient()
        webView.webChromeClient = ProcaptchaWebChromeClient()
        val encodedHtml = generateEncodedHtml()
        webView.loadData(encodedHtml, "text/html", "base64")
    }

    private fun generateEncodedHtml(): String {
        val html = """
            <html>
                <head>
                    <title>Procaptcha</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <script type="module" src="https://js.prosopo.io/js/procaptcha.bundle.js" async defer></script>
                </head>
                <body>
                    <form action="" method="POST">
                        <a href="https://prosopo.io">Link</a>
                        <input type="text" name="email" placeholder="Email" />
                        <input type="password" name="password" placeholder="Password" />
                        <div class="procaptcha" data-sitekey="5FWCbfR7pH9QiZqLgmm5Rw4QbFwyU5EaMqUV4G6xrvrTZDtC"></div>
                        <br />
                        <input type="submit" value="Submit" />
                    </form>
                </body>
            </html>
        """.trimIndent()
        return Base64.encodeToString(html.toByteArray(), Base64.NO_PADDING)
    }
}
