
# email + password + verification link

vs magic link directly as login

# So you got magic link? But here is the architecture choice that might be worth to consider and how to make it safe?

 If a magic-link token reaches the browser in the URL, it can leak through browser history, server logs, reverse-proxy logs, analytics tools, monitoring tools, and `Referer` headers, and OWASP explicitly warns that tokens and OTPs in query strings are sensitive data exposure even when HTTPS is used. [owasp](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url)

But “frontend first” is still acceptable if you design it so the browser only sees the token **briefly** and your app removes it immediately, avoids third-party exposure, and never treats that URL as a durable authenticated state. The risk is manageable; it is not a reason to reject the pattern entirely. [datatracker.ietf](https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/06/)

## What can leak

If the email link is `https://site.com/auth/magic?token=...`, that token can end up in browser history and in logs at any layer that records full URLs. OWASP gives this exact category of issue as “information exposure through query strings in URL,” and explicitly lists tokens and OTPs as data that should not be exposed there. [owasp-aasvs.readthedocs](http://owasp-aasvs.readthedocs.io/en/latest/requirement-9.3.html)

It can also leak when the callback page loads third-party scripts, images, or analytics that receive the page URL via `Referer`. That is one reason sensitive callback pages should be kept very minimal. [owasp](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url)

## Why frontend-first still works

Many modern auth flows still begin with a browser callback URL and then immediately exchange the temporary credential for a real session. The browser-based OAuth guidance notes that modern apps can remove temporary codes from the query string using the Session History API without reloading the page. [datatracker.ietf](https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/06/)

That same idea applies here: landing on the frontend first is okay if the token is just a one-time, short-lived credential that is redeemed immediately and then removed from the URL. The unsafe part is leaving it sitting around in the address bar, logs, or rendered app state. [owasp](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url)

## Safe pattern

The safest frontend-first pattern for your stack is:

- Email link lands on `site.com/auth/magic#token=...`. [owasp](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url)
- That page loads with no analytics or third-party assets. [owasp](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url)
- Next.js immediately sends the token to Spring in a POST request body, not in another URL. OWASP guidance says sensitive data should be sent in the HTTP body or headers, not in query strings. [github](https://github.com/OWASP/ASVS/issues/1313)
- Spring validates the one-time token, invalidates it, and sets the session cookie. [docs.spring](https://docs.spring.io/spring-security/reference/servlet/authentication/onetimetoken.html)
- The frontend immediately rewrites the URL to remove the token from browser history. The browser-based OAuth guidance specifically notes that modern apps can remove temporary codes from the query string. [datatracker.ietf](https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/06/)
- Responses on these routes use `Cache-Control: no-store`, because `no-store` means the response may not be stored in any cache. [github](https://github.com/OWASP/ASVS/issues/1674)

## Better variants

A better variant is to put only a **lookup handle** in the URL and require the real secret exchange in the backend, or keep the token lifetime extremely short and one-time-use. OWASP’s concern is the exposure of sensitive credentials in URLs, so reducing token value and lifetime lowers the blast radius if it leaks. [cwe.mitre](https://cwe.mitre.org/data/definitions/598.html)

Another improvement is to avoid loading your normal app shell on the callback route. A tiny dedicated page that redeems the token and redirects is safer than loading full analytics, chat widgets, and product scripts before token redemption. [owasp](https://owasp.org/www-community/vulnerabilities/Information_exposure_through_query_strings_in_url)

## Recommendation

So yes, sending the magic link to the branded frontend URL has leakage risk, but it is still a standard and workable design when you apply the right controls. For your Next + Spring app, I would use a dedicated minimal callback page, immediate POST-to-backend exchange, instant URL cleanup, one-time short-lived tokens, and `Cache-Control: no-store` on all auth responses. [owasp](https://owasp.org/www-project-secure-headers/)

If you want the absolute lowest leakage exposure, the next step is designing the link so the browser-facing URL contains a non-sensitive reference and Spring does the real secret lookup server-side. [owasp-aasvs.readthedocs](http://owasp-aasvs.readthedocs.io/en/latest/requirement-9.3.html)
