const kModes = {
    UNLOCKED: "unlocked",
    LOCKED: "locked",
};
const kDebug = false;

function Debug(...args) {
    if (kDebug) {
        console.log.apply(null, args);
    }
}

function SetTabZoom(tab, mode, zoom) {
    Debug("SetTabZoom", tab, mode, zoom);
    if (tab.url.search(/^chrome:/) === 0) {
        return;
    }
    if (mode === kModes.UNLOCKED) {
        return;
    }
    chrome.tabs.setZoom(tab.id, zoom);
}

function UpdateTabs(mode, zoom) {
    chrome.tabs.query(
        {},
        function(tabs) {
            for (i = 0; i < tabs.length; i++) {
                SetTabZoom(tabs[i], mode, zoom);
            }
        });
}

function UpdateBadge(mode, zoom) {
    Debug("UpdateBadge", mode, zoom);
    var t;
    if (mode === kModes.UNLOCKED) {
        t = "off";
    } else if (zoom === 0) {
        t = "def";
    } else {
        t = "" + Math.round(zoom * 100);
    }
    chrome.browserAction.setBadgeText({text:t});
}

function LoadZoomSettings(fn) {
    chrome.storage.local.get(
        ["mode", "zoom"],
        function(vals) { fn(vals.mode, vals.zoom); });
}

function SaveZoomSettings(mode, zoom, fn) {
    chrome.storage.local.set(
        {mode: mode, zoom: zoom},
        function() {
            UpdateBadge(mode, zoom);
            UpdateTabs(mode, zoom);
        });
}

function ToggleZoomMode(current_tab) {
    Debug("ToggleZoomMode");
    chrome.tabs.getZoom(
        current_tab.id,
        function(current_zoom) {
            LoadZoomSettings(
                function(mode, zoom) {
                    if (mode === kModes.UNLOCKED) {
                        mode = kModes.LOCKED;
                        zoom = current_zoom;
                    } else {
                        mode = kModes.UNLOCKED;
                    }
                    SaveZoomSettings(mode, zoom);
                });
        });
}

chrome.tabs.onCreated.addListener(
    function(tab) {
        Debug("tabs.onCreated", tab);
        LoadZoomSettings(
            function(mode, zoom) { SetTabZoom(tab, mode, zoom); });
    });
 
chrome.tabs.onUpdated.addListener(
    function(tab_id, change_info, tab) {
        Debug("tabs.onUpdated", tab_id, change_info, tab);
        LoadZoomSettings(
            function(mode, zoom) { SetTabZoom(tab, mode, zoom); });
    });
    
chrome.tabs.onZoomChange.addListener(
    function(info) {
        Debug("tabs.onZoomChange", info);
        if (info.newZoomFactor === info.oldZoomFactor) {
            return;
        }
        LoadZoomSettings(
            function(mode, zoom) {
                if (mode === kModes.LOCKED && zoom !== info.newZoomFactor) {
                    zoom = info.newZoomFactor;
                    SaveZoomSettings(mode, zoom);
                }
            });
    });
 
chrome.runtime.onInstalled.addListener(
    function(info) {
        Debug("runtime.onInstalled");
        SaveZoomSettings(kModes.UNLOCKED, 0);
    });
    
chrome.runtime.onStartup.addListener(
    function() {
        Debug("runtime.onStartup");
        LoadZoomSettings(
            function(mode, zoom) {
                UpdateBadge(mode, zoom);
                UpdateTabs(mode, zoom);
            });
    });
 
chrome.browserAction.onClicked.addListener(
    function(tab) {
        Debug("browserAction.onClicked");
        ToggleZoomMode(tab);
    });