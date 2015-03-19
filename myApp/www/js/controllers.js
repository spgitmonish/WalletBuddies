angular.module('starter.controllers', [])


//.controller('DashCtrl', function($scope) {})


.controller('AccountCtrl', function($scope, fireBaseData, $firebase) {
    $scope.acc = $firebase(fireBaseData.refUsers()).$asArray();

    $scope.addAccount = function(account) {
        //console.log("Inside addAccount");
        $scope.acc.$add({
            //console.log("Inside account");
            name: account.name,
            email: account.email,
            phone: account.phone,
            password: account.password,
            security: account.security
        });
        account.name = "John";
        account.email = "example@email.com";
        account.phone = 7202227777;
        account.password = "dodo";
        account.security = 55;

    };


})

//controller for submitting social circle form


.controller('GroupCtrl', function($scope, fireBaseData, $firebase, ContactsService, $cordovaContacts) {

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
                console.log("Bummer.  Failed to pick a contact");
            }
        );

    }

    //ends here


    //Writing data to Firebase

    $scope.group = $firebase(fireBaseData.refSocialcircle()).$asArray();


    $scope.addGroup = function(user) {


        $scope.group.$add({
            //console.log("Inside group");
            //picture:user.picture,
            groupName: user.groupName,
            plan: user.plan,
            amount: user.amount,
            groupMessage: user.groupMessage,
            contacts: $scope.data.selectedContacts
        });


        //user.picture="";
        user.groupName = "";
        user.plan = "weekly";
        user.amount = 0;
        user.groupMessage = "";
        //user.checked= "";


    };

    //ends here

})


//controller for plaid API

.controller('ConnectCtrl', function($scope, fireBaseData, $firebase, $state, $stateParams, Plaid, ConnectStore) {

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


.controller('ConnectDetailCtrl', function($scope, $state, fireBaseData, $firebase, $stateParams, Plaid, ConnectStore) {


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


//Plaid ConnectCTRL ends


//Sign up and Sign in controllers

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
                    console.log("Please enter valid credentials");
                    alert("Please enter valid credentials.");
                    return false;
                }

                ref.authWithPassword({
                        email: email,
                        password: password
                    },
                    function(error, authData) {
                        if (error) {
                            console.log("Login Error!");
                            alert("Login Error! Try again.");
                        } else {
                            console.log("Sign In successful");
                            $state.go('tab.dash');
                        }
                    });
            }
            //$state.go('tab.dash');
    }
])

.controller('SignUpCtrl', ['$scope', '$rootScope', '$state',
    function($scope, $rootScope, $state) {
        var ref = new Firebase("https://walletbuddies.firebaseio.com/");

        $scope.user = {
            email: "",
            password: ""
        };

        $scope.signUp = function() {
            var email = this.user.email;
            var password = this.user.password;

            if (!email || !password) {
                console.log("Please enter valid credentials");
                alert("Please enter valid credentials");
                return false;
            }

            ref.createUser({
                    email: email,
                    password: password
                },
                function(error, userData) {
                    if (error) {
                        switch (error.code) {
                            case "EMAIL_TAKEN":
                                console.log("The new user account cannot be created because the email is already in use.");
                                alert("The new user account cannot be created because the email is already in use.");
                                break;
                            case "INVALID_EMAIL":
                                console.log("The specified email is not a valid email.");
                                alert("The specified email is not a valid email.");
                                break;
                            default:
                                console.log("Error creating user.");
                                alert("Error creating user.");
                        }
                    } else {
                        console.log("User Created Successfully!");
                        alert("User Created Successfully!");
                        $state.go('tab.dash');
                    }

                });

        }

    }
])

//Sign up and Sign in controllers ends

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

});