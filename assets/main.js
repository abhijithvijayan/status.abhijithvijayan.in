// const STATUS_PAGE_URL = "https://stats.uptimerobot.com/pzxzYf90DR/788159955";
const STATUS_PAGE_URL = "https://abhijithvijayan.instatus.com";
const SERVER_URL = "https://site-fetcher.deta.dev/api/v1/html";
// const CACHE_TTL = 5 * 60 * 1000; // stats are re-fetched every 5 mins, so retrieve from cache with a TTL of 5mins
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 HOURS

const events = {
    INIT: "init"
}

function getQueryParams(params) {
    return Object.keys(params).reduce((prev, curr) => {
        if (prev.length === 1) {
            prev += `${curr}=${params[curr].toString()}`;
        } else {
            prev += `&${curr}=${params[curr].toString()}`;
        }

        return prev;
    }, "?")
}

function request(url, params, cb) {
    const http = new XMLHttpRequest();

    http.addEventListener('load', cb.bind(null, http));
    http.addEventListener('error', cb.bind(null, http));
    http.open("GET", url);
    http.open("GET", `${url}${getQueryParams(params)}`, true);
    http.send();
}

// script that does the manipulation to the DOM after re-rendered in iframe
const scriptToInject = `
    <script>
        const lastUpdated = document.getElementsByClassName('last-updated')[0];
        // hide last updated datetime item
        lastUpdated.parentElement && lastUpdated.parentElement.style.setProperty("visibility", "hidden");

        // listen to an event from the parent wrapper with event payload
        window.addEventListener('message', function(event) {
            if (typeof event.data === 'object') {
                const {data: payload, type} = event.data || {};
                const {events, data} = payload || {};

                if (type === events.INIT) {
                    // update the last-updated item in DOM with the cache's timestamp
                    if (lastUpdated) {
                        lastUpdated.parentElement && lastUpdated.parentElement.style.setProperty("visibility", "visible");
                        lastUpdated.innerText = new Date(data.lastUpdated).toLocaleString();
                    }
                }   
            }
        }, false);

        // hide the counter elements
        const counter = document.getElementsByClassName("counter")[0];
        if (counter) {
            counter.previousSibling && counter.previousSibling.remove();
            counter.previousSibling && counter.nextSibling.remove();
            counter.remove();
        }

        // hide the footer  
        const footer = document.getElementsByTagName("footer")[0];
        if (footer) {
            footer.style.setProperty("visibility", "hidden");
        }
         
        const anchors = document.getElementsByTagName('a');
        for (let anchor of anchors) {
            // corrupting links
            anchor.href = '#';
            // and hiding them
            anchor.style.setProperty('display', 'none', 'important');           
        }
    </script>
`

// inject custom script into body
function injectScriptIntoSrcDoc(htmlStr) {
    return (
        htmlStr
            .replace('</body>', '')
            // so adding the script above the html tag with properly closed body tag
            .replace('</html>', `${scriptToInject}</body></html>`)
    );
}

// sanitize the html string
function sanitize(htmlStr) {
    // killing dynamic countdown function action
    // this function is responsible for firing api call to refetch
    const sanitized = htmlStr.replace("function countdown() {", `
        const countdown = () => {};
        function __countdown__() {
    `).replace('src="/', `src="${STATUS_PAGE_URL}/`);

    return injectScriptIntoSrcDoc(sanitized);
}

// init function
(() => {
    const iframe = document.createElement("iframe");
    const loader = document.getElementById("loader");
    const root = document.getElementById("app");
    const error = document.getElementById("error");

    // hide iframe by default
    iframe.setAttribute("hidden", "hidden");

    // inject iframe into body
    root.append(iframe);

    let responseJSON;
    iframe.addEventListener("load", () => {
        if (iframe.hasAttribute("srcdoc")) {
            // make iframe visible again
            iframe.removeAttribute("hidden");

            // actions need to run with the response JSON within the script injected
            iframe.contentWindow.postMessage({
                    type: events.INIT,
                    data: {
                        events,
                        data: {
                            lastUpdated: responseJSON.data.timestamp,
                        }
                    }
                },
                '*'
            );

            // hide loader after a delay
            setTimeout(() => {
                // hide loader
                loader.setAttribute("hidden", "hidden");
            }, 500)
        }
    });

    request(SERVER_URL, {
        url: STATUS_PAGE_URL,
        cacheTTL: CACHE_TTL
    }, (req, event) => {

        function errorHandler() {
            // show error section
            error.removeAttribute("hidden");
            // hide loader
            loader.setAttribute("hidden", "hidden");
        }

        switch (event.type) {
            case "load": {
                try {
                    // Get response json from response text
                    responseJSON = JSON.parse(req.responseText);
                    // Get html from data
                    const pageHTML = responseJSON.data.html;

                    // show it in iframe
                    iframe.srcdoc = sanitize(pageHTML);
                } catch (ex) {
                    errorHandler();
                }

                break;
            }

            case "error": {
                errorHandler();
                break;
            }
        }
    })
})();
