angular.module('starter.controllers', [])

// Controller for Account Creation and Sign Up
.controller('AccountCtrl', function($scope, fireBaseData, $firebase, $state, $rootScope, $email, $http, $log) {
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
                    alert("User created successfully");

                    var fbAuth = fbRef.getAuth();

                    // Validate that the user has signed into a Firebase account
                    if(fbAuth){
                        // Create a new link for the user based on the email id
                        var fbUser = new Firebase(fbRef.child('Users') + "/" + escapeEmailAddress(account.email));
                        $scope.user = $firebase(fbUser);

                        // Try and write the data($update doesn't overwrite the data which exists)
                        $scope.user.$update({
                            firstname: account.firstname,
                            lastname: account.lastname
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
                        
                        // Go to the chats tab                        
                        $state.go('tab.chats');
                    }
                }
            });
        }
    }
})

// Controller for submitting social circle form
.controller('GroupCtrl', function($scope, fireBaseData, $firebase, ContactsService, $cordovaContacts, $rootScope, $state, $firebaseAuth) {
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
        $scope.user = $firebase(fbUser);
        
        // Use angular.copy to avoid $$hashKey being added to object
        $scope.data.selectedContacts = angular.copy($scope.data.selectedContacts);

        // Get the social circle name
        var circleName = convertCircleName(user.groupName);
        console.log(circleName);

        // Get a unique link to the social circle
        var fbCircle = new Firebase(fbUser + "/" + circleName);

        // Create a firebase object
        $scope.circle = $firebase(fbCircle);

        // Update the user profile with the following data for this social circle
        $scope.circle.$update({
            circleName: user.groupName,
            plan: user.plan,
            amount: user.amount,
            groupMessage: user.groupMessage,
            contacts: $scope.data.selectedContacts
        });

        // Logic for Sign Out
        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
        $rootScope.fbAuth = $firebaseAuth(fbRef);

        $rootScope.logout = function() {
          $rootScope.fbAuth.$logout();
        }

        // Clear the forms
        user.groupName = "";
        user.plan = "weekly";
        user.amount = 0;
        user.groupMessage = "";

        // Go to the launch page
        $state.go('launch');
    }

})

// Controller for plaid API
.controller('ConnectCtrl', function($scope, fireBaseData, $firebase, $state, $stateParams, Plaid, ConnectStore, $rootScope) {

    $scope.user = {
        type: '',
        username: 'plaid_test',
        password: 'plaid_good'
    };

    $scope.connectPlaid = $firebase(fireBaseData.refPlaid()).$asArray();
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
.controller('ConnectDetailCtrl', function($scope, $state, fireBaseData, $firebase, $stateParams, Plaid, ConnectStore, $rootScope) {
    $scope.connection = ConnectStore.get();

    console.log($scope.connection);

    $scope.connectPlaid = $firebase(fireBaseData.refPlaid()).$asArray();

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
                        // Switch tabs
                        $state.go('tab.chats');
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
.controller('ChatsCtrl', function($scope, Chats) {
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