// Notifications section
if (window.webkitNotifications) {
    if (window.webkitNotifications.checkPermission() != 0) {
        $("#html5_notification").show();
    }
} else {
    console.log("Notifications are not supported for this Browser/OS version yet.");
}

var mention_store = "mention_store";
var private_store = "private_store";

    // Check if same section and delete
    if( window.location.pathname == '/privates' ) {
        window.localStorage.setItem(private_store, 0);
    }

    if( window.location.pathname == '/mentions' ) {
        window.localStorage.setItem(mention_store, 0);
    }

    // Show or hide depending of content
    update_counters();

    function setupNotifications(username) {
        var socket = io.connect('http://coolpa.net');
        socket.emit('username', username);
        socket.on('notification', function (data) {
            if (window.webkitNotifications) {
                if (window.webkitNotifications.checkPermission() == 0) {
                    window.webkitNotifications.createNotification('http://coolpa.net/avatars/avatar.jpg', data.title, data.message).show();
                }
            }
            if( data.type == 'mention' ) {
                var cnt = parseInt( window.localStorage.getItem(mention_store) == undefined ? 0 : window.localStorage.getItem(mention_store) ) + 1;
                window.localStorage.setItem(mention_store, cnt);
            } else if( data.type == 'private' ) {
                var cnt = parseInt( window.localStorage.getItem(private_store) == undefined ? 0 : window.localStorage.getItem(private_store) ) + 1;
                window.localStorage.setItem(private_store, cnt);
            }

            update_counters();
        });
    }

    function update_counters() {
        if( window.localStorage.getItem(mention_store) == undefined || window.localStorage.getItem(mention_store) == 0 ) {
            $("#badge_mention").hide();
        } else {
            $("#badge_mention").html( ( parseInt( window.localStorage.getItem(mention_store) ) > 9 ) ? "9+" : parseInt( window.localStorage.getItem(mention_store) ) );
            $("#badge_mention").show();
        }

        if( window.localStorage.getItem(private_store) == undefined || window.localStorage.getItem(private_store) == 0 ) {
            $("#badge_private").hide();
        } else {
            $("#badge_private").html( ( parseInt( window.localStorage.getItem(private_store) ) > 9 ) ? "9+" : parseInt( window.localStorage.getItem(private_store) ) );
            $("#badge_private").show();
        }
    }

    function enableNotifications() {
        window.webkitNotifications.requestPermission(function() {
            if (window.webkitNotifications.checkPermission() == 0) {
                $("#html5_notification").hide();
            }
        });
    }