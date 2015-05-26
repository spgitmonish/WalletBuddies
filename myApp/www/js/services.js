angular.module('starter.services', [])

//Plaid API factory

.value('API_URL', "https://tartan.plaid.com")
.value('plaid_client_id', "test_id")
.value('plaid_secret', "test_secret")
.value('FBURL', "https://walletbuddies.firebaseio.com")

.factory('PostsArray', function (FBURL, PostsArrayFactory) {
    return function (limitToLast) {
        if (!limitToLast) {
            console.error("Need limitToLast");
            return null;
        }
        var postsRef = new Firebase(FBURL + '/Circles').orderByChild('circleID').equalTo(limitToLast);
        return new PostsArrayFactory(postsRef);
    }
})

.factory('PostsArrayFactory', function ($q, $firebaseArray) {
    return $firebaseArray.$extend({
        getPost: function (postKey) {
            var deferred = $q.defer();
            var post = this.$getRecord(postKey);
            this.$loaded().then(function () {
                if (post) {
                    console.log("Got post", post);
                    deferred.resolve(post);
                } else {
                    deferred.reject("Post with key:" + postKey + " not found.");
                }
            }).
            catch (function (error) {
                deferred.reject(error);
            });
            return deferred.promise;
        },
        createPost: function (post) {
            var deferred = $q.defer();
            post.timestamp = Firebase.ServerValue.TIMESTAMP;
            this.$add(post).then(function (ref) {
                var id = ref.key();
                console.log("added post with id", id, "post:", post);
                deferred.resolve(ref);
            }).
            catch (function (error) {
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

.factory('Circles', function($rootScope){
    var circlesInfo;

    return{
        set: function(value){
            circlesInfo = value;
        },

        get: function(){
            return circlesInfo;
        }
    };
})

.factory('fbCallback', function(){
	
	return{
		fetch: function(path, callback){
			path.once('value', function(data) {
				callback(data.val());
			});
		},
		
		orderByChild: function(path, status, callback){
			path.orderByChild("Status").equalTo(status).on('child_added', function(data){
				console.log("SERVICE: " + data.key());
				callback(data);
			});
		}
	}
})

.factory('CirclesTest', function($rootScope){
    var circlesInfo;

    return{
        set: function(value){
            circlesInfo = value;
        },

        get: function(){
            return circlesInfo;
        }
    };
})

//Plaid API factory ends here
.factory('Chats', function() {
    // Might use a resource here that returns a JSON array

    // Some fake testing data
    var chats = [{
        id: 0,
        name: 'Ben Sparrow',
        lastText: 'You on your way?',
        face: 'https://pbs.twimg.com/profile_images/514549811765211136/9SgAuHeY.png'
    }, {
        id: 1,
        name: 'Max Lynx',
        lastText: 'Hey, it\'s me',
        face: 'https://avatars3.githubusercontent.com/u/11214?v=3&s=460'
    }, {
        id: 2,
        name: 'Andrew Jostlin',
        lastText: 'Did you get the ice cream?',
        face: 'https://pbs.twimg.com/profile_images/491274378181488640/Tti0fFVJ.jpeg'
    }, {
        id: 3,
        name: 'Adam Bradleyson',
        lastText: 'I should buy a boat',
        face: 'https://pbs.twimg.com/profile_images/479090794058379264/84TKj_qa.jpeg'
    }, {
        id: 4,
        name: 'Perry Governor',
        lastText: 'Look at my mukluks!',
        face: 'https://pbs.twimg.com/profile_images/491995398135767040/ie2Z_V6e.jpeg'
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
.factory('Friends', function() {
    // Might use a resource here that returns a JSON array

    // Some fake testing data
    // Some fake testing data
    var friends = [{
        id: 0,
        name: 'Ben Sparrow',
        notes: 'Enjoys drawing things',
        face: 'https://pbs.twimg.com/profile_images/514549811765211136/9SgAuHeY.png'
    }, {
        id: 1,
        name: 'Max Lynx',
        notes: 'Odd obsession with everything',
        face: 'https://avatars3.githubusercontent.com/u/11214?v=3&s=460'
    }, {
        id: 2,
        name: 'Andrew Jostlen',
        notes: 'Wears a sweet leather Jacket. I\'m a bit jealous',
        face: 'https://pbs.twimg.com/profile_images/491274378181488640/Tti0fFVJ.jpeg'
    }, {
        id: 3,
        name: 'Adam Bradleyson',
        notes: 'I think he needs to buy a boat',
        face: 'https://pbs.twimg.com/profile_images/479090794058379264/84TKj_qa.jpeg'
    }, {
        id: 4,
        name: 'Perry Governor',
        notes: 'Just the nicest guy',
        face: 'https://pbs.twimg.com/profile_images/491995398135767040/ie2Z_V6e.jpeg'
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