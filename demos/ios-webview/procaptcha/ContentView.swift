import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let filePath: String
    
    func makeCoordinator() -> Coordinator {
        return Coordinator(self)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        let webViewConfiguration = WKWebViewConfiguration()
        webViewConfiguration.preferences.javaScriptEnabled = true

        // Set up user content controller for message handling (logging)
        let userContentController = WKUserContentController()
        userContentController.add(context.coordinator, name: "consoleLog")

        // Inject JavaScript to override console.log
        let scriptSource = """
        (function() {
            var oldLog = console.log;
            var oldWarn = console.warn;
            var oldError = console.error;
            var oldInfo = console.info;
            var oldDebug = console.debug;

            function sendMessage(type, args) {
                var message = '[' + type + '] ' + Array.from(args).join(' ');
                window.webkit.messageHandlers.consoleLog.postMessage(message);
            }

            console.log = function() { sendMessage('LOG', arguments); oldLog.apply(console, arguments); };
            console.warn = function() { sendMessage('WARN', arguments); oldWarn.apply(console, arguments); };
            console.error = function() { sendMessage('ERROR', arguments); oldError.apply(console, arguments); };
            console.info = function() { sendMessage('INFO', arguments); oldInfo.apply(console, arguments); };
            console.debug = function() { sendMessage('DEBUG', arguments); oldDebug.apply(console, arguments); };
        })();
        """
        
        let script = WKUserScript(source: scriptSource, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        userContentController.addUserScript(script)
        
        // Add the user content controller to the configuration
        webViewConfiguration.userContentController = userContentController
        
        let webView = WKWebView(frame: .zero, configuration: webViewConfiguration)
        webView.navigationDelegate = context.coordinator
        webView.isInspectable = true
        
        //DispatchQueue.main.asyncAfter(deadline: .now() + 30) {
        guard let fileUrl = Bundle.main.url(forResource: filePath, withExtension: nil) else {
            fatalError("html file \(filePath) not found")
        }
        webView.loadFileURL(fileUrl, allowingReadAccessTo: fileUrl.deletingLastPathComponent())
        //}
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        // Handle any updates if necessary
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: WebView
        
        init(_ parent: WebView) {
            self.parent = parent
        }
        
        // This is where JavaScript messages are received
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "consoleLog", let messageBody = message.body as? String {
                print("JavaScript Console: \(messageBody)") // Log to Xcode console
            }
        }
        
        // Handle navigation actions
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if navigationAction.navigationType == .linkActivated {
                decisionHandler(.cancel)
            } else {
                decisionHandler(.allow)
            }
        }
    }
}

struct ContentView: View {
    var body: some View {
        VStack {
            Text("Demo Procaptcha:")
            WebView(filePath: "procaptcha.html")
        }
        .padding()
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
