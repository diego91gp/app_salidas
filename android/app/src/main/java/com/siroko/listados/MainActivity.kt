package com.siroko.listados

import android.annotation.SuppressLint
import android.content.SharedPreferences
import android.content.res.Configuration
import android.net.http.SslError
import android.os.Bundle
import android.text.InputType
import android.util.Base64
import android.util.Log
import android.webkit.CookieManager
import android.webkit.HttpAuthHandler
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.LinearLayout
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import java.io.BufferedInputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var prefs: SharedPreferences

    private val startUrl = "https://velneo.siroko.com/alm_app"
    private val tag = "APP_ALMACEN_WEBVIEW"

    private var currentUser: String = ""
    private var currentPass: String = ""

    companion object {
        private const val PREFS_NAME = "apk_almacen_config"
        private const val PREF_USER = "http_user"
        private const val PREF_PASS = "http_pass"
    }

    private val imgCacheDir: File by lazy {
        File(cacheDir, "img_cache").also { it.mkdirs() }
    }

    private fun imageCacheFile(url: String): File {
        val key = MessageDigest.getInstance("MD5")
            .digest(url.toByteArray())
            .joinToString("") { "%02x".format(it) }
        return File(imgCacheDir, key)
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        webView = findViewById(R.id.webView)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val rawUrl = request.url?.toString().orEmpty()
                if (rawUrl.isBlank()) return super.shouldInterceptRequest(view, request)

                if (!isTargetImageHost(rawUrl)) {
                    return super.shouldInterceptRequest(view, request)
                }

                return try {
                    val finalUrl = rawUrl
                    val mime = guessMime(finalUrl)
                    val cacheFile = imageCacheFile(finalUrl)

                    if (cacheFile.exists()) {
                        return WebResourceResponse(mime, "binary", BufferedInputStream(cacheFile.inputStream()))
                    }

                    val connection = (URL(finalUrl).openConnection() as HttpURLConnection).apply {
                        instanceFollowRedirects = true
                        connectTimeout = 10000
                        readTimeout = 15000
                        requestMethod = "GET"
                        setRequestProperty("Accept", "image/*,*/*;q=0.8")
                        setRequestProperty("User-Agent", request.requestHeaders["User-Agent"] ?: "Mozilla/5.0")
                    }
                    connection.connect()

                    val code = connection.responseCode
                    if (code in 200..299) {
                        val detectedMime = connection.contentType?.substringBefore(";")?.trim()
                            ?.ifEmpty { mime } ?: mime
                        val bytes = connection.inputStream.readBytes()
                        connection.disconnect()
                        cacheFile.writeBytes(bytes)
                        WebResourceResponse(detectedMime, "binary", BufferedInputStream(cacheFile.inputStream()))
                    } else {
                        Log.e(tag, "Image proxy failed code=$code url=$finalUrl")
                        connection.disconnect()
                        null
                    }
                } catch (e: Exception) {
                    Log.e(tag, "Image proxy exception for $rawUrl: ${e.message}")
                    null
                }
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                val js = """
                    (function() {
                      if (window.__img_error_hooked__) return;
                      window.__img_error_hooked__ = true;
                      document.addEventListener('error', function(e) {
                        var t = e && e.target;
                        if (t && t.tagName === 'IMG') {
                          console.log('[IMG_ERROR] ' + (t.currentSrc || t.src || 'unknown'));
                        }
                      }, true);
                    })();
                """.trimIndent()
                view.evaluateJavascript(js, null)
            }

            override fun onReceivedHttpAuthRequest(
                view: WebView,
                handler: HttpAuthHandler,
                host: String,
                realm: String
            ) {
                if (currentUser.isNotBlank() && currentPass.isNotBlank()) {
                    Log.i(tag, "HTTP AUTH challenge host=$host realm=$realm -> using saved credentials")
                    handler.proceed(currentUser, currentPass)
                } else {
                    handler.cancel()
                    showCredentialDialog(
                        force = true,
                        errorMessage = "CONFIGURA USUARIO Y CONTRASEÑA"
                    )
                }
            }

            override fun onReceivedError(
                view: WebView,
                request: WebResourceRequest,
                error: WebResourceError
            ) {
                Log.e(tag, "Web error url=${request.url} code=${error.errorCode} desc=${error.description}")
                super.onReceivedError(view, request, error)
            }

            override fun onReceivedHttpError(
                view: WebView,
                request: WebResourceRequest,
                errorResponse: WebResourceResponse
            ) {
                Log.e(tag, "HTTP error url=${request.url} status=${errorResponse.statusCode}")
                super.onReceivedHttpError(view, request, errorResponse)
            }

            override fun onReceivedSslError(
                view: WebView,
                handler: SslErrorHandler,
                error: SslError
            ) {
                Log.e(tag, "SSL error url=${error.url} primaryError=${error.primaryError}")
                handler.proceed()
            }
        }

        webView.webChromeClient = WebChromeClient()

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = false
            displayZoomControls = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            loadsImagesAutomatically = true
            blockNetworkImage = false
            allowFileAccess = true
            allowContentAccess = true
        }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                finishAffinity()
            }
        })

        if (savedInstanceState != null) {
            loadCredentialsFromPrefs()
            webView.restoreState(savedInstanceState)
            return
        }

        loadCredentialsFromPrefs()
        if (currentUser.isNotBlank() && currentPass.isNotBlank()) {
            validateAndLoad(currentUser, currentPass)
        } else {
            showCredentialDialog(force = true)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    private fun loadCredentialsFromPrefs() {
        currentUser = prefs.getString(PREF_USER, "")?.trim().orEmpty()
        currentPass = prefs.getString(PREF_PASS, "") ?: ""
    }

    private fun saveCredentials(user: String, pass: String) {
        prefs.edit()
            .putString(PREF_USER, user)
            .putString(PREF_PASS, pass)
            .apply()
        currentUser = user
        currentPass = pass
    }

    private fun showCredentialDialog(force: Boolean, errorMessage: String? = null) {
        val userInput = EditText(this).apply {
            hint = "Usuario"
            inputType = InputType.TYPE_CLASS_TEXT
            setText(currentUser)
        }
        val passInput = EditText(this).apply {
            hint = "Contraseña"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setText(currentPass)
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (16 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
            addView(userInput)
            addView(passInput)
        }

        val title = if (errorMessage.isNullOrBlank()) {
            "Configuración inicial"
        } else {
            "Credenciales inválidas"
        }

        val message = errorMessage ?: "Introduce usuario y contraseña para acceder"

        AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage(message)
            .setView(container)
            .setCancelable(!force)
            .setNegativeButton(if (force) "Salir" else "Cancelar") { _, _ ->
                if (force) finishAffinity()
            }
            .setPositiveButton("Guardar y probar", null)
            .create().also { dialog ->
                dialog.setOnShowListener {
                    val positive = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
                    positive.setOnClickListener {
                        val user = userInput.text?.toString()?.trim().orEmpty()
                        val pass = passInput.text?.toString().orEmpty()
                        if (user.isBlank() || pass.isBlank()) {
                            userInput.error = if (user.isBlank()) "Obligatorio" else null
                            passInput.error = if (pass.isBlank()) "Obligatorio" else null
                            return@setOnClickListener
                        }

                        dialog.dismiss()
                        validateAndLoad(user, pass, clearCache = true)
                    }
                }
                dialog.show()
            }
    }

    private fun validateAndLoad(user: String, pass: String, clearCache: Boolean = false) {
        Thread {
            val ok = testCredentials(user, pass)
            runOnUiThread {
                if (ok) {
                    saveCredentials(user, pass)
                    loadStartUrlWithAuth(user, pass, clearCache)
                } else {
                    showCredentialDialog(
                        force = true,
                        errorMessage = "No se pudo validar acceso. Revisa usuario/contraseña."
                    )
                }
            }
        }.start()
    }

    private fun testCredentials(user: String, pass: String): Boolean {
        return try {
            val connection = (URL(startUrl).openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = true
                connectTimeout = 8000
                readTimeout = 10000
                requestMethod = "GET"
                setRequestProperty("Authorization", buildBasicHeader(user, pass))
            }
            connection.connect()
            val code = connection.responseCode
            Log.i(tag, "Credential test status=$code")
            connection.disconnect()
            code in 200..399
        } catch (e: Exception) {
            Log.e(tag, "Credential test exception: ${e.message}")
            false
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        // La Activity no se recrea en rotación; el WebView mantiene su estado JS.
    }

    private fun loadStartUrlWithAuth(user: String, pass: String, clearCache: Boolean = false) {
        if (clearCache) {
            webView.clearCache(true)
            imgCacheDir.listFiles()?.forEach { it.delete() }
        }
        webView.loadUrl(startUrl, mapOf("Authorization" to buildBasicHeader(user, pass)))
    }

    private fun buildBasicHeader(user: String, pass: String): String {
        val raw = "$user:$pass"
        val basic = Base64.encodeToString(raw.toByteArray(), Base64.NO_WRAP)
        return "Basic $basic"
    }

    private fun isTargetImageHost(url: String): Boolean {
        val lower = url.lowercase()
        val hostHit = lower.contains("://cdn.siroko.com/")
        if (!hostHit) return false
        return lower.contains(".jpg") || lower.contains(".jpeg") || lower.contains(".png") || lower.contains(".webp")
    }

    private fun guessMime(url: String): String {
        val lower = url.lowercase()
        return when {
            lower.contains(".png") -> "image/png"
            lower.contains(".webp") -> "image/webp"
            lower.contains(".jpg") || lower.contains(".jpeg") -> "image/jpeg"
            else -> "image/jpeg"
        }
    }
}
