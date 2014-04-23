function Popup() {
    this.init();
}

Popup.prototype = {
    init: function () {
        this.ui.refreshList();

        chrome.runtime.onMessage.addListener(this.events.onMessage.bind(this));
        chrome.storage.onChanged.addListener(this.events.onStorageChange.bind(this));

        $('.tab-button').on('click', this.events.onUITabSelect.bind(this));
        $('#delay-select').on('click', '.delay-select-button', this.events.onUIDelaySelect.bind(this));
        $('#delay-list').on('click', '.delay-item-remove', this.events.onUIRemove.bind(this));
        $('#delay-list').on('click', '.delay-item-open', this.events.onUIOpen.bind(this));
    },

    events: {
        /**
         * Run when a delay is selected
         * @param {event} event
         */
        onUIDelaySelect: function (event) {
            var type = $(event.target).data('type');
            chrome.runtime.sendMessage(['delayCurrentTab', [type], 'popup']);
            //this.delayCurrentTab(type);
        },

        onUITabSelect: function (event) {
            var tab = $(event.target).data('tab');
            this.ui.showUITab(tab);
        },

        onUIRemove: function (event) {
            chrome.runtime.sendMessage(['removeAlarm', [event.target.parentNode.id], 'popup']);
        },

        onUIOpen: function (event) {
            chrome.runtime.sendMessage(['loadTabById', [event.target.parentNode.id], 'popup']);
        },

        /**
         * Refresh list on storage change
         */
        onStorageChange: function () {
            this.ui.refreshList();
        },

        /**
         * run a function using a message from another window
         * @param {array} message [string method, array args, string origin]
         * where first argument is the method name, second is an array of
         * arguments and the last is the source sender, to avoid running your own messages.
         * @param [sender]
         * @param [sendResponse]
         */
        onMessage: function (message, sender, sendResponse) {
            if (message[2] === 'popup'){
                return;
            }
            this[message[0]].apply(this, message[1]);
        }
    },

    ui: {
        showUITab: function (tabId) {
            this.hideUITabs();
            this.refreshList();
            $('#' + tabId).show();
        },

        hideUITabs: function () {
            $('.tab').hide();
        },

        refreshList: function () {
            chrome.storage.local.get(null, function (items) {
                var el = $('#delay-list');
                var li, url, title, when, id;

                el.empty();
                for (id in items) {
                    if (!items.hasOwnProperty(id)) {
                        return;
                    }

                    url = _.escape(items[id][0]);
                    title = _.escape(items[id][1]);
                    when = moment(items[id][2]).fromNow();
                    li =
                        '<li class="delay-item" id="' + id + '">' +
                        '   <span title="' + url + '">' + title + '</span>' +
                        '   <em>' + when + '</em>' +
                        '   <button class="delay-item-open">Open</button>' +
                        '   <button class="delay-item-remove">Remove</button>' +
                        '</li>';

                    el.append($(li));
                }
            });
        }
    }
};

var popup = new Popup();
