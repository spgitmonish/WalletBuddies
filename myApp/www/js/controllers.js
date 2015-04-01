angular.module('starter.controllers', [])

// Controller for Account Creation and Sign Up
.controller('AccountCtrl', function($scope, fireBaseData, $state, $rootScope, $email, $http, $log) {
    // Function to do the Sign Up and Add the Account
    $scope.addAccount = function(account) {
        // Make sure all the fields have a value
        if (!account.email || !account.password || !account.firstname || !account.lastname) {
            alert("Please enter all credentials");
        }
        else {
            console.log("All fields entered");

            // Get a reference to the Firebase account
            var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

            // Create the User
            fbRef.createUser({
                email: account.email,
                password: account.password
            },
            function(error, userData) {
                // Handle all the error cases
                if (error) {
                    switch (error.code) {
                        case "EMAIL_TAKEN":
                            alert("The new user account cannot be created because the email is already in use.");
                            break;
                        case "INVALID_EMAIL":
                            alert("The specified email is not a valid email.");
                            break;
                        default:
                            alert("Error creating user.");
                    }
                }
                else {
                    // Create a new link for the user based on the email id
                    $scope.user = new Firebase(fbRef.child('Users') + "/" + escapeEmailAddress(account.email));

                    // Try and write the data($update doesn't overwrite the data which exists)
                    $scope.user.update({firstname: account.firstname, lastname: account.lastname}, function(error) {
					    if (error) {
					    	console.log("Error:", error);
					    } else {
					        console.log("Profile set successfully!");
					    }
					});

                    // Before we switch tabs let's store the email address so that it is
                    // available across all controllers
                    $rootScope.useremail = account.email;

                    // SendGrid email notification
                    var api_user = "deepeshsunku";
                    var api_key = "eq6-yEs-fav-xKs";
                    var to = account.email;
                    var name = account.name;

                    $email.$send(api_user, api_key, to, name,
                    "You're all set!",
                    "Thanks for signing up with Wallet Buddies, you can now start saving with your buddies - we hope you have fun saving :)" +
                    "\n\n-WalletBuddies" +
                    "\n\n", "deepesh.sunku@walletbuddies.co");

                    alert("User created successfully");

                    // Go to the chats tab
                    $state.go('tab.chats');
                }
            });
        }
    }
})

// Controller for submitting social circle form
.controller('GroupCtrl', function($scope, fireBaseData, ContactsService, $cordovaContacts, $rootScope, $state, $firebaseAuth) {
    //For accessing the device's contacts
    $scope.data = {
        selectedContacts: []
    };

    $scope.pickContact = function() {
        ContactsService.pickContact().then(
            function(contact) {
                $scope.data.selectedContacts.push(contact);
                console.log(contact);
            },
            function(failure) {
                console.log("Bummer. Failed to pick a contact");
            }
        );
    }

    // This function is called when the "Invite your wallet buddies" button is pressed
    $scope.addGroup = function(user) {
        // Get the link unique for this user
        var fbUser = new Firebase("https://walletbuddies.firebaseio.com/Users" + "/" + escapeEmailAddress($rootScope.useremail));
        console.log("Social Circle: " + $rootScope.useremail);
        console.log("User link :" + fbUser);

        // Use angular.copy to avoid $$hashKey being added to object
        $scope.data.selectedContacts = angular.copy($scope.data.selectedContacts);

        // Get the social circle name
        var circleName = convertCircleName(user.groupName);
        console.log(circleName);

        // Get the link to the Circles of the User
        var fbCircle = new Firebase(fbUser + "/Circles/");

        // Push the following data for this circle under this user
        fbCircle.push({
            circleName: user.groupName,
            plan: user.plan,
            amount: user.amount,
            groupMessage: user.groupMessage,
            contacts: $scope.data.selectedContacts
        });

        // Logic for Sign Out
        /*var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
        $rootScope.fbAuth = $firebaseAuth(fbRef);

        $rootScope.logout = function() {
            $rootScope.selectedContacts = $scope.data.selectedContacts;
            $rootScope.fbAuth.$logout();
        }*/

        // Clear the forms
        user.groupName = "";
        user.plan = "weekly";
        user.amount = 0;
        user.groupMessage = "";

        // Go to the launch page
        $state.go('dash');
    }

})

// Controller for plaid API
.controller('ConnectCtrl', function($scope, fireBaseData, $state, $stateParams, Plaid, ConnectStore, $rootScope, $firebaseArray) {

    $scope.user = {
        type: '',
        username: 'plaid_test',
        password: 'plaid_good'
    };

    $scope.connectPlaid = $firebaseArray(fireBaseData.refPlaid());
    // get All institutions
    Plaid.getInstitutions().then(function(result) {
        $scope.institutions = result.data;
        //console.log(result.data);
    }, function(error) {
        console.error(error);
    });

    $scope.connect = function(user) {
        Plaid.auth(user.type, user.username, user.password).then(function(result) {
            console.log(result);

            if (result.status == 200) {
                ConnectStore.save(result.data);
                $scope.connectPlaid.$add({
                    results: result.data
                });

                result.data = "0";

                //$state.go('tab.chat-detail');
            }

            if (result.status == 201) {
                ConnectStore.save(result.data);
                alert(result.data.access_token + " MFA required " + user.type);
                // $state.go('tab.bank-auth');

                var answer_question = "tomato";
                //$scope.answer = function (user){
                //new try------------------------------------------ call within a call
                //$scope.authStep = function (result) {
                Plaid.authStep(user.type, answer_question, result.data.access_token).then(function(response) {
                    console.log(response);

                    //if (result) {
                    ConnectStore.save(response.data);
                    $scope.connectPlaid.$add({
                        results: response.data
                    });

                    response.data = "0";
                    //}


                }, function(error) {
                    alert("There was an error connecting\n ERROR: " + error.data.message + '\n RESOLVE: ' + error.data.resolve);
                });
                //}
            }

        }, function(error) {
            alert("There was an error connecting\n ERROR: " + error.data.message + '\n RESOLVE: ' + error.data.resolve);
        });

    };

})

// Controller for Connection Details
.controller('ConnectDetailCtrl', function($scope, $state, fireBaseData, $stateParams, Plaid, ConnectStore, $rootScope, $firebaseArray) {
    $scope.connection = ConnectStore.get();

    console.log($scope.connection);

    $scope.connectPlaid = $firebaseArray(fireBaseData.refPlaid());

    $scope.connect = function(user) {
        //last working point

        Plaid.authStep(user.answer, connection.type, connection.access_token).then(function(result) {
            console.log(result);
            $state.go('tab.chat-detail');

            if (result.status == 200) {
                ConnectStore.save(result.data);
                $scope.connectPlaid.$add({
                    results: result.data
                });

                result.data = "No data";

                //$state.go('tab.chat-detail');
            }

            if (result.status == 201) {
                //alert("MFA required");
                ConnectStore.save(result.data);
                $scope.connectPlaid.$add({
                    results: result.data
                });
                result.data = "No data";

                // $state.go('tab.bank-auth');
            }

        }, function(error) {
            alert("There was an error connecting\n ERROR: " + error.data.message + '\n RESOLVE: ' + error.data.resolve);
        });

    };
})

// Controller for Sign In
.controller('SignInCtrl', ['$scope', '$state', '$rootScope',
    function($scope, $state, $rootScope) {
        var ref = new Firebase("https://walletbuddies.firebaseio.com/");

        $scope.user = {
            email: "",
            password: ""
        };

        $scope.validateUser = function() {
            var email = this.user.email;
            var password = this.user.password;

            if (!email || !password) {
                alert("Please enter valid credentials.");
                return false;
            }

            ref.authWithPassword({
                    email: email,
                    password: password
                },
                function(error, authData) {
                    if (error) {
                        alert("Login Error! Try again.");
                    } else {
                        console.log("Sign In successful");
                        // Before we switch tabs let's store the email address so that it is available across all controllers
                        $rootScope.useremail = email;

                        // Get the link unique for this user
                        var fbUser = new Firebase("https://walletbuddies.firebaseio.com/Users" + "/" + escapeEmailAddress($rootScope.useremail));

                        // Get the link to the Circles of the User
                        var fbCircle = new Firebase(fbUser + "/Circles/");

                        // Create an array which stores all the information
                        $rootScope.circlesArray = [];
                        var loopCount = 0;

                        // Retrieve all the social circles under this user
                        // Note: This callback occurs repeatedly till all the "children" are parsed
                        fbCircle.on("child_added", function(snapshot) {
                          var circleVal = snapshot.val();
                          $rootScope.circlesArray.push(circleVal)
                          console.log("Name: " + $rootScope.circlesArray[loopCount].circleName);
                          console.log("Plan: " + $rootScope.circlesArray[loopCount].plan);
                          console.log("Amount: " + $rootScope.circlesArray[loopCount].amount);
                          console.log("Message: " + $rootScope.circlesArray[loopCount].groupMessage);
                          console.log("Number of circles:" + loopCount);
                          loopCount++;
                        });

                        // Length will always equal count, since snap.val() will include every child_added event
                        // triggered before this point
                        fbCircle.once("value", function(snap) {
                            // The actual length is +1 of the value returned by Object.keys(snap.val()).length
                            console.log("Initial data loaded!", Object.keys(snap.val()).length === loopCount);
                            // The data is ready, switch to the Chats tab
                            $state.go('tab.chats');
                        });
                    }
                }
            );
        }

        // Clear the forms
        $scope.user.email = "";
        $scope.user.password = "";
    }
])


// Other unfilled and unused controllers
.controller('ChatsCtrl', function($scope, Chats, $rootScope) {
    // Make sure the data is available in this controller
    console.log("Inside Chats" + $rootScope.circlesArray[0].circleName);

    $scope.chats = Chats.all();
    $scope.remove = function(chat) {
        Chats.remove(chat);
    }
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
    $scope.chat = Chats.get($stateParams.chatId);
})

.controller('FriendsCtrl', function($scope, Friends) {
    $scope.friends = Friends.all();
})

.controller('FriendDetailCtrl', function($scope, $stateParams, Friends) {
    $scope.friend = Friends.get($stateParams.friendId);
})

.controller('DashCtrl', function($scope) {
    $scope.settings = {
        enableFriends: true
    };

})

// Function to modify the email address to create a unique link based on the user
function escapeEmailAddress(email) {
  if (!email) return false
  // Replace '.' (not allowed in a Firebase key) with ','
  email = email.toLowerCase();
  email = email.replace(/\./g, ',');
  return email.trim();
};

// Function to modify the social circle name to remove whitespaces, convert to lower case
function convertCircleName(circlename) {
  if (!circlename) return false
  circlename = circlename.toLowerCase();
  circlename = circlename.replace(/ /g, '');
  return circlename.trim();
};