var connections = {};

// set enabled icon + popup
function setIconAndPopup( tabId ) {
    chrome.action.setIcon( {
        tabId: tabId,
        path: {
            "16": "/image/swfapplogo16.png",
            "48": "/image/swfapplogo48.png",
            "128": "/image/swfapplogo128.png"
        },
    } );
    chrome.action.setPopup( {
        tabId: tabId,
        popup: '/src/popup/popup.html',
    } );
}

chrome.runtime.onConnect.addListener( function( port ) {
    var extensionListener = function( message, sender, sendResponse ) {
        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
        if(typeof(message) == String){
            alert(message);
        }

        if( message.name == "init" ) {
            connections[ message.tabId ] = port;
            return;
        }

        // other message handling
    }

    // Listen to messages sent from the DevTools page
    port.onMessage.addListener( extensionListener );

    port.onDisconnect.addListener( function( port ) {
        port.onMessage.removeListener( extensionListener );
        var tabs = Object.keys( connections );
        for( var i = 0, len = tabs.length; i < len; i++ ) {
            if( connections[ tabs[ i ] ] == port ) {
                delete connections[ tabs[ i ] ]
                break;
            }
        }
    } );
} );

// Receive message from content script and relay to the devTools page for the
// current tab
chrome.runtime.onMessage.addListener( function( request, sender, sendResponse ) {
    // Messages from content scripts should have sender.tab set
    if( sender.tab ) {
        var tabId = sender.tab.id;
        if( request.isSWFApp ) {
            setIconAndPopup( tabId );
        }
        if( tabId in connections ) {
            connections[ tabId ].postMessage( request );
        } else {
            console.log( "Tab not found in connection list." );
        }
    } else {
        console.log( "sender.tab not defined." );
    }
} );
