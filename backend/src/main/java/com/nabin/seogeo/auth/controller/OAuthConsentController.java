package com.nabin.seogeo.auth.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import java.util.LinkedHashSet;
import java.util.Set;

@RestController
@RequestMapping("/oauth2")
public class OAuthConsentController {

    private final RegisteredClientRepository registeredClientRepository;

    public OAuthConsentController(RegisteredClientRepository registeredClientRepository) {
        this.registeredClientRepository = registeredClientRepository;
    }

    @GetMapping(path = "/consent", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> consentPage(
            @RequestParam("client_id") String clientId,
            @RequestParam("state") String state,
            @RequestParam(value = "scope", required = false) Set<String> scopes
    ) {
        RegisteredClient registeredClient = registeredClientRepository.findByClientId(clientId);
        if (registeredClient == null) {
            return ResponseEntity.notFound().build();
        }

        Set<String> requestedScopes = scopes == null ? Set.of() : new LinkedHashSet<>(scopes);
        StringBuilder authorizeScopeInputs = new StringBuilder();
        StringBuilder requestedScopeList = new StringBuilder();
        for (String scope : requestedScopes) {
            authorizeScopeInputs.append("<input type=\"hidden\" name=\"scope\" value=\"")
                    .append(escape(scope))
                    .append("\">");
            requestedScopeList.append("<li>")
                    .append(escape(scope))
                    .append("</li>");
        }

        String html = """
                <!doctype html>
                <html lang="en">
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <title>Authorize SEOGEO Access</title>
                  <style>
                    :root { color-scheme: light; }
                    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f4f7f2; color: #112014; }
                    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
                    section { width: min(100%%, 480px); background: #ffffff; border: 1px solid #d8e2d3; border-radius: 20px; padding: 28px; box-shadow: 0 20px 50px rgba(17, 32, 20, 0.08); }
                    h1 { margin: 0 0 8px; font-size: 1.6rem; }
                    p { margin: 0 0 18px; line-height: 1.5; color: #465448; }
                    ul { margin: 0 0 24px; padding-left: 20px; }
                    li { margin-bottom: 8px; }
                    .actions { display: flex; gap: 12px; }
                    button { border: 0; border-radius: 999px; padding: 12px 18px; font-weight: 600; cursor: pointer; }
                    .approve { background: #0f8a4b; color: #fff; }
                    .deny { background: #eff3ec; color: #213125; }
                  </style>
                </head>
                <body>
                <main>
                  <section>
                    <h1>Authorize %s</h1>
                    <p>%s wants permission to access your SEOGEO MCP server.</p>
                    <ul>%s</ul>
                    <div class="actions">
                      <form method="post" action="/oauth2/authorize">
                        <input type="hidden" name="client_id" value="%s">
                        <input type="hidden" name="state" value="%s">
                        %s
                        <button class="approve" type="submit">Authorize</button>
                      </form>
                      <form method="post" action="/oauth2/authorize">
                        <input type="hidden" name="client_id" value="%s">
                        <input type="hidden" name="state" value="%s">
                        <button class="deny" type="submit">Cancel</button>
                      </form>
                    </div>
                  </section>
                </main>
                </body>
                </html>
                """.formatted(
                escape(registeredClient.getClientName()),
                escape(registeredClient.getClientName()),
                requestedScopeList,
                escape(clientId),
                escape(state),
                authorizeScopeInputs,
                escape(clientId),
                escape(state)
        );

        return ResponseEntity.ok(html);
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }
}
