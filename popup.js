// Created by Weiwei Jiang on 20171022
// 
// Funtions for Weiwei's Chrome Tools
//

/**
 * Get the current URL. Copied from Chrome's extension tutorial
 *
 * @param {function(string)} callback called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
    // Query filter to be passed to chrome.tabs.query - see
    // https://developer.chrome.com/extensions/tabs#method-query
    var queryInfo = {
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, (tabs) => {
        // chrome.tabs.query invokes the callback with a list of tabs that match the
        // query. When the popup is opened, there is certainly a window and at least
        // one tab, so we can safely assume that |tabs| is a non-empty array.
        // A window can only have one active tab at a time, so the array consists of
        // exactly one tab.
        var tab = tabs[0];

        // A tab is a plain object that provides information about the tab.
        // See https://developer.chrome.com/extensions/tabs#type-Tab
        var url = tab.url;

        // tab.url is only available if the "activeTab" permission is declared.
        // If you want to see the URL of other tabs (e.g. after removing active:true
        // from |queryInfo|), then the "tabs" permission is required to see their
        // "url" properties.
        console.assert(typeof url == 'string', 'tab.url should be a string');

        callback(url);
    });

    // Most methods of the Chrome extension APIs are asynchronous. This means that
    // you CANNOT do something like this:
    //
    // var url;
    // chrome.tabs.query(queryInfo, (tabs) => {
    //   url = tabs[0].url;
    // });
    // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

function saveFilter(url, expression) {
    var items = {};
    items[url] = expression;
    chrome.storage.sync.set(items);
}

function getSavedFilter(url, callback) {
    // See https://developer.chrome.com/apps/storage#type-StorageArea. We check
    // for chrome.runtime.lastError to ensure correctness even when the API call
    // fails.
    chrome.storage.sync.get(url, (items) => {
        callback(chrome.runtime.lastError ? null : items[url]);
    });
}

function filterLinks(url, expression) {
    var script = 'var urls = [];\
    for (var i = document.links.length; i-->0;)\
        urls.push(document.links[i].href);\
    console.log("' + expression.toString() + '");\
    urls';

    chrome.tabs.executeScript({
        code: script
    }, function (result) {
        var filteredLinks = [];
        var re = new RegExp(expression);
        links = result[0];

        for (var i = links.length; i-- > 0;) {
            link = links[i];
            if (re.test(link) && (-1 == filteredLinks.indexOf(link))) {
                filteredLinks = filteredLinks.concat(link);
            }
        }

        document.getElementById("count").innerHTML = "<p> Matched " + filteredLinks.length.toString() + " items.</p>";
        document.getElementById("result").innerHTML = filteredLinks.toString().split(',').join('<br />');
    });
}

function getAndDownloadLinks() {

    filteredLinks = document.getElementById("result").innerHTML.split('<br>')

    for (var i = filteredLinks.length; i-- > 0;) {
        link = filteredLinks[i];

        console.log("Downloading " + link);
        chrome.downloads.download({
            url: link,
            filename: "batch_download/" + link.match(/[^\\/]+$/)[0]
        })

    }
}

document.addEventListener('DOMContentLoaded', () => {
    getCurrentTabUrl((url) => {

        // Restore filter if existed
        getSavedFilter(url, (savedFilter) => {
            if (savedFilter) {
                filterLinks(url, savedFilter);
                document.getElementById('filter').value = savedFilter;
            }
        });

        document.getElementById('batchDownload').addEventListener('click', () => {
            getAndDownloadLinks();
        });
        document.getElementById('filter').addEventListener('change', () => {
            filterLinks(url, document.getElementById('filter').value);
            saveFilter(url, document.getElementById('filter').value);
        })

    });
});

