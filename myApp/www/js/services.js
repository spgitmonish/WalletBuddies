angular.module('starter.services', [])

//Plaid API factory

.value('API_URL', "https://tartan.plaid.com")
    .value('plaid_client_id', "test_id")
    .value('plaid_secret', "test_secret")
    .value('FBURL', "https://walletbuddies.firebaseio.com")

.factory('PostsArray', function(FBURL, PostsArrayFactory) {
    return function(limitToLast) {
        if (!limitToLast) {
            console.error("Need limitToLast");
            return null;
        }
        var postsRef = new Firebase(FBURL + '/Circles').orderByChild('circleID').equalTo(limitToLast);
        return new PostsArrayFactory(postsRef);
    }
})

.factory('PostsArrayFactory', function($q, $firebaseArray) {
    return $firebaseArray.$extend({
        getPost: function(postKey) {
            var deferred = $q.defer();
            var post = this.$getRecord(postKey);
            this.$loaded().then(function() {
                if (post) {
                    console.log("Got post", post);
                    deferred.resolve(post);
                } else {
                    deferred.reject("Post with key:" + postKey + " not found.");
                }
            }).
            catch(function(error) {
                deferred.reject(error);
            });
            return deferred.promise;
        },
        createPost: function(post) {
            var deferred = $q.defer();
            post.timestamp = Firebase.ServerValue.TIMESTAMP;
            this.$add(post).then(function(ref) {
                var id = ref.key();
                console.log("added post with id", id, "post:", post);
                deferred.resolve(ref);
            }).
            catch(function(error) {
                deferred.reject(error);
            });
            return deferred.promise;
        }
    });
})

.factory('Plaid', function($http, API_URL, plaid_client_id, plaid_secret) {

    return {

        getInstitutions: function() {
            return $http.get(API_URL + "/institutions");
        },

        getCategories: function() {
            return $http.get(API_URL + "/categories");
        },

        connect: function(type, username, password, pin, options) {
            return $http.post(API_URL + "/connect", {
                client_id: plaid_client_id,
                secret: plaid_secret,
                type: type,
                username: username,
                password: password,
                pin: pin || null,
                options: options || null
            });
        },

        connectStep: function(type, username, password, pin, options) {
            return $http.post(API_URL + "/connect/step", {
                client_id: plaid_client_id,
                secret: plaid_secret,
                type: type,
                username: username,
                password: password,
                pin: pin || null,
                options: options || null
            });
        },


        authStep: function(type, mfaAnswer, access_token) {
            return $http.post(API_URL + "/auth/step", {
                client_id: plaid_client_id,
                secret: plaid_secret,
                type: type,
                mfa: mfaAnswer,
                access_token: access_token

            });
        },

        connectGet: function(type, username, password, pin, options) {
            return $http.post(API_URL + "/connect/get", {
                client_id: plaid_client_id,
                secret: plaid_secret,
                type: type,
                username: username,
                password: password,
                pin: pin || null,
                options: options || null
            });
        },


        balance: function(access_token) {
            return $http.post(API_URL + "/balance", {
                client_id: plaid_client_id,
                secret: plaid_secret,
                access_token: access_token
            });
        },


        upgrade: function(access_token, upgrade_to, options) {
            return $http.post(API_URL + "/upgrade", {
                client_id: plaid_client_id,
                secret: plaid_secret,
                access_token: access_token,
                upgrade_to: upgrade_to,
                options: options
            });
        },


        auth: function(type, username, password, pin, options) {
            return $http.post(API_URL + "/auth", {
                client_id: plaid_client_id,
                secret: plaid_secret,
                type: type,
                username: username,
                password: password,
                pin: pin || null,
                options: options || null
            });
        }
    }
})

.factory('ConnectStore', function() {

    var connectionStore = this.connectionStore = {};

    return {
        save: function(connection) {
            connectionStore = connection;
        },

        get: function() {
            return connectionStore;
        }
    }
})

.factory('Circles', function($rootScope) {
    var circlesInfo;

    return {
        set: function(value) {
            circlesInfo = value;
        },

        get: function() {
            return circlesInfo;
        }
    };
})

.factory('fbCallback', function() {

    return {
        // Fetch the data
        fetch: function(path, callback) {
            path.once('value', function(data) {
                callback(data.val());
            });
        },

        // Fetch the data on child added events
        childAdded: function(path, status, callback) {
            path.orderByChild("Status").equalTo(status).on('child_added', function(data) {
                console.log("SERVICE(Added): " + data.key());
                callback(data);
            });
        },

        // Fetch the data on child removal events
        childRemoved: function(path, status, callback) {
            path.orderByChild("Status").equalTo(status).on('child_removed', function(data) {
                console.log("SERVICE(Removed): " + data.key());
                callback(data);
            });
        }
    }
})

//Plaid API factory ends here

.factory('Deals', function() {
    // Might use a resource here that returns a JSON array

    // Some fake testing data
    var chats = [{
        id: 0,
        name: 'Looney\'s Pub',
        text: '$15 Weekly Happy Hour',
        face: './img/lp.png'
    }, {
        id: 1,
        name: 'Board & Brew',
        text: '$10 Bi-Weekly Games & Coffee',
        face: './img/bb.png'
    }, {
        id: 2,
        name: 'Cornerstone',
        text: '$15 Monthly Trivia Nights',
        face: './img/cs.png'
    }, {
        id: 3,
        name: 'Regal Cinemas',
        text: '$8 Monthly Movie Wednesdays',
        face: './img/regal.png'
    }, {
        id: 4,
        name: 'Maryland Adventure Program',
        text: '$60 Monthly Camping & Hiking',
        face: './img/map.png'
    }, {
        id: 5,
        name: 'AMF Bowling Lanes',
        text: '$15 Weekly Bowling Thursdays',
        face: './img/amf.png'
    }];

    return {
        all: function() {
            return chats;
        },
        remove: function(chat) {
            chats.splice(chats.indexOf(chat), 1);
        },
        get: function(chatId) {
            for (var i = 0; i < chats.length; i++) {
                if (chats[i].id === parseInt(chatId)) {
                    return chats[i];
                }
            }
            return null;
        }
    }
})

/**
 * A simple example service that returns some data.
 */
.factory('DealsDetail', function() {
    // Might use a resource here that returns a JSON array

    // Some fake testing data
    // Some fake testing data
    var friends = [{
        id: 0,
        
        name: 'Happy Hour @ Looney\'s Pub',
        company:'Looney\'s Pub',
        amount: '15 Weekly',
        what: 'Happy Hour every week at Looney\'s pub. Every member in your group gets 2 beers and an appetizer.',
        face: './img/lp.png'
    }, {
        id: 1,
        name: 'Games & Coffee @ Board & Brew',
        company:'Board & Brew',
        amount: '10 Bi-Weekly',
        what: 'Come on over to Board and Brew any weekday and you to get to pick any board game with a coffee and a short eat.',
        face: './img/bb.png'
    }, {
        id: 2,
        name: 'Trivia Nights @ CornerStone',
        company:'CornerStone',
        amount: '15 Monthly',
        what: 'Enjoy Trivia Nights with a pitcher of beer per person in your group.',
        face: './img/cs.png'
    }, {
        id: 3,
        name: 'Movie Wednesdays @ Regal Cinemas',
        company:'Regal Cinemas',
        amount: '8 monthly',
        what: 'Watch the latest blockbusters with free popcorn for your group at Regal Cinemas every first Wednesday of the month with this awesome deal.',
        face: './img/regal.png'
    }, {
        id: 4,
        name: 'Camping & Hiking by Maryland Adventure Program',
        company:'Maryland Adventure Program',
        amount: '60 Monthly',
        what: 'Get out and enjoy the outdoors by spending a weekend every month camping and hiking acoss the state.',
        face: './img/map.png'
    }, {
        id: 5,
        name: 'Thursday\'s @ AMF Bowling Lanes',
        company:'AMF Bowling Lanes',
        amount: '15 Weekly',
        what: 'Bring your buddies to AMF every Thursdays for 3 rounds of bowling and a drink!',
        face: './img/amf.png'
    }];


    return {
        all: function() {
            return friends;
        },
        get: function(friendId) {
            // Simple index lookup
            return friends[friendId];
        }
    }
})

//Service for picking contacts
.factory("ContactsService", ['$q', function($q) {
        var formatContact = function(contact) {
            return {
                "displayName": contact.name.formatted || contact.name.givenName + " " + contact.name.familyName || "Mystery Person",
                "phones": contact.phoneNumbers || [],
                //"photos": contact.photos || [],
                "emails": contact.emails || []
            };

        };

        var pickContact = function() {
            var deferred = $q.defer();
            if (navigator && navigator.contacts) {
                console.log("CONTACTS: " + navigator.contacts);
                navigator.contacts.pickContact(function(contact) {
                    console.log("CONTACTS 2: " + contact);
                    deferred.resolve(formatContact(contact));
                });
            } else {
                deferred.reject("Bummer.  No contacts in desktop browser");
            }
            return deferred.promise;
        };
        return {
            pickContact: pickContact
        };
    }])
    //Contacts service ends here

// Place holder function to access any data in the app
.factory('fireBaseData', function($firebase) {
    var ref = new Firebase("https://walletbuddies.firebaseio.com/"),
        refUsers = new Firebase("https://walletbuddies.firebaseio.com/Users"),
        refPlaid = new Firebase("https://walletbuddies.firebaseio.com/Users/Plaid");

    return {
        ref: function() {
            return ref;
        },
        refSocialcircle: function() {
            return refSocialcircle;
        },
        refUsers: function() {
            return refUsers;
        },
        refPlaid: function() {
            return refPlaid;
        }
    }
});