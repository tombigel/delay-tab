function DelayTab() {
    this.init();
}

_.extend(DelayTab.prototype, {
    init: function () {
        chrome.runtime.onMessage.addListener(this.events.onMessage.bind(this));
        chrome.alarms.onAlarm.addListener(this.events.onAlarm.bind(this));
    },

    /**
     * Set active tab to open on later date
     * @param {string} delayType any type in Popup.dates
     */
    delayCurrentTab: function (delayType) {
        var delayTab = this.delayTab.bind(this);
        var when = this.dates.get(delayType);

        var params = {
            active  : true,
            windowId: chrome.windows.WINDOW_ID_CURRENT
        };

        chrome.tabs.query(params, function (tabs) {
            var tab = tabs[0];
            delayTab(tab.id, tab.url, tab.title, when.valueOf());
        });
    },

    /**
     * Set a url to open in a new tab on later date
     * @param {string} tabId the tab session id
     * @param {string} url the url to load
     * @param {string} title the title of the page to be displayed in the list
     * @param {number} when a standard Unix time stamp
     */
    delayTab: function (tabId, url, title, when) {
        var uniqueId = when.toString(36) + '-' + _.random(10000, 99999).toString(36);
        this.setAlarm(uniqueId, when);
        this.saveAlarm(uniqueId, url, title, when);
        this.closeTab(tabId);
    },

    /**
     * create a new alarm event with unique id
     * @param {string} id a unique id for this delayed entry
     * @param {number} when a standard Unix time stamp
     */
    setAlarm: function (id, when) {
        chrome.alarms.create(id, {when: when});
    },

    /**
     * Save the url to local storage
     * @param {string} id a unique id for this delayed entry
     * @param {string} url the url to load
     * @param {string} title the title of the page to be displayed in the list
     * @param {number} when a standard Unix time stamp
     */
    saveAlarm: function (id, url, title, when) {
        var tab = {};
        tab[id] = [url, title, when];
        chrome.storage.local.set(tab);
    },

    /**
     * Get a stored tab details
     * @param {string} uniqueId
     */
    loadTabById: function (uniqueId, callback) {
        loadTab = this.loadTab.bind(this);
        chrome.storage.local.get(uniqueId, function (items) {
            loadTab(items[uniqueId][0]);
            if(callback){
                callback;
            }
        });
    },

    /**
     * Open a new tab with url
     * @param {string} url
     */
    loadTab: function (url) {
        chrome.tabs.create({url: url});
    },

    /**
     * Close tab with id tabId
     * @param {string} tabId
     */
    closeTab: function (tabId) {
        chrome.tabs.remove(tabId);
    },

    /**
     * Remove alarm with id uniqueId
     * @param {string} uniqueId
     */
    removeAlarm: function (uniqueId) {
        chrome.storage.local.remove(uniqueId);
        chrome.alarms.clear(uniqueId);
    },

    events: {
        /**
         * Run when alarm pops
         * @param {chrome.alarm} alarm the alarm object
         */
        onAlarm: function (alarm) {
            var uniqueId = alarm.name;
            this.loadTabById(uniqueId, function () {
                this.removeAlarm(uniqueId);
            }.bind(this));

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
            if (message[2] === 'background') {
                return;
            }
            this[message[0]].apply(this, message[1]);
        }
    },

    dates: {
        MORNING      : 8,
        EVENING      : 18,
        NIGHT        : 22,
        WEEKEND_START: 5,
        WEEKEND_END  : 6,
        WEEK_START   : 0,

        get: function (delayType) {
            return this[delayType]();
        },

        thisEvening: function () {
            var evening = moment().hour(this.EVENING);
            var night = moment().hour(this.NIGHT);
            var now = moment();

            var when = evening;

            if (now.isAfter(evening)) {
                if (now.isBefore(night)) {
                    when = now.add('hours', 1);
                } else {
                    when = this.tomorrowEvening();
                }
            }
            return when;
        },

        tomorrowMorning: function () {
            var when = moment().add('days', 1).hour(this.MORNING);
            return when;
        },

        tomorrowEvening: function () {
            var when = moment().add('days', 1).hour(this.EVENING);
            return when;
        },

        weekend: function () {
            var weekendStart = moment().weekday(this.WEEKEND_START).hour(this.EVENING);
            var weekendEnd = moment().weekday(this.WEEKEND_END).hour(this.EVENING);
            var now = moment();

            var when = weekendStart;

            if (now.isAfter(weekendStart)) {
                if (now.isBefore(weekendEnd)) {
                    when = this.thisEvening();
                } else {
                    when = weekendStart.add('days', 7);
                }
            }
            return when;
        },

        nextWeek: function () {
            var when = moment().add('weeks', 1).weekday(this.WEEK_START).hour(this.MORNING);
            return when;
        },

        custom: function (date) {
            return moment(date).add('minutes', 3);
        }
    }
});

new DelayTab();
