angular.module('starter.controllers', [])

// Controller for Account Creation and Sign Up
.controller('AccountCtrl', function($scope, fireBaseData, $state, $rootScope, $email, $http, $log, Circles, $firebaseAuth) {
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
                    // Get the Authorization object using the Firebase link
                    var fbAuth = $firebaseAuth(fbRef);

                    // Check for authorization
                    fbAuth.$authWithPassword({
                        email: account.email,
                        password: account.password
                    }).then(function(authData) {
                        // This is all asynchronous
                        console.log("Logged in as: " + authData.uid);

                        // Get the Firebase link for this user
                        var fbUser = fbRef.child("Users").child(authData.uid);
                        console.log("Link: " + fbUser);

                        // Store the user information
                        fbUser.update({
                            firstname: account.firstname,
                            lastname: account.lastname,
                            email: account.email,
                            phonenumber: account.phonenumber
                        });
                        
                        // Create user's unique Hash and save under the Registered Users folder
                        // Use a secret string and set the id length to be 4
			            var hashids = new Hashids("SecretMonkey", 4);
			            // Use the user's phone number
			            // Converting string to integer
			            var temp = parseInt(account.phonenumber);
			            account.phonenumber = temp;
			            console.log("Phones:   " + account.phonenumber);
			            var id = hashids.encode(account.phonenumber);
			            console.log("Hashids: " + hashids + id);
			
			            // Write the user's unique hash to registered users and save his UID 
			            var fbHash = new Firebase(fbRef + "/RegisteredUsers/" + id);
			            fbHash.update({
				            uid: authData.uid
			            });

                        // SendGrid email notification
                        var api_user = "deepeshsunku";
                        var api_key = "hdG-vU7-ETH-FwS";
                        var to = account.email;
                        var name = account.firstname;

                        $email.$send(api_user, api_key, to, name,
                        name + "! You're all set",
                        "Thanks for signing up with Wallet Buddies, you can now start saving with your buddies - we hope you have fun saving :)\n\n\n" +
                        "\n\n - Team Wallet Buddies" +
                        "\n\n", "deepesh.sunku@walletbuddies.co");

                        alert("User created successfully");

                        // Get the link to the Circles of the User
                        var fbCircle = new Firebase(fbRef + "/Circles/");

                        // Create an array which stores all the information
                        var circlesArray = [];
                        var loopCount = 0;

                        // Retrieve all the social circles under this user
                        // Note: This callback occurs repeatedly till all the "children" are parsed
                        fbCircle.on("child_added", function(snapshot) {
                          var circleVal = snapshot.val();
                          circlesArray.push(circleVal)
                          console.log("Name: " + circlesArray[loopCount].circleName);
                          console.log("GroupID: " + circlesArray[loopCount].circleID);
                          console.log("Plan: " + circlesArray[loopCount].plan);
                          console.log("Amount: " + circlesArray[loopCount].amount);
                          console.log("Message: " + circlesArray[loopCount].groupMessage);
                          loopCount++;
                          console.log("Number of circles:" + loopCount);
                        });

                        // Length will always equal count, since snap.val() will include every child_added event
                        // triggered before this point
                        fbCircle.once("value", function(snap) {
                            // Use the setter and set the value so that it is accessible to another controller
                            Circles.set(circlesArray);
                            // The data is ready, switch to the Wallet tab
                            $state.go('tab.wallet');
                        });
                    }).catch(function(error) {
                        console.error("Authentication failed: " + error);
                    });
                }
            });
        }
    }
})

// Controller for submitting social circle form
.controller('GroupCtrl', function($scope, $firebaseObject, fireBaseData, ContactsService, fbCallback, $cordovaContacts, $rootScope, $state, $email, $http, $log) {
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
        // Get a reference to the Firebase account
        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

        // Get the link to the Circles of the User
        var fbCircle = new Firebase(fbRef + "/Circles/");
        console.log("Circle:" + fbCircle);
        
        // Get the link to the user profile
		var fbProfile = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid);     

        // Use angular.copy to avoid $$hashKey being added to object
        $scope.data.selectedContacts = angular.copy($scope.data.selectedContacts);
		console.log("Contacts Array: " + $scope.data.selectedContacts[0].emails[0].value);
		
		//  Method for removing symbols in phone numbers
        for( var i=0; i<$scope.data.selectedContacts.length; i++){
			var str = $scope.data.selectedContacts[i].phones[0].value;
			$scope.data.selectedContacts[i].phones[0].value = str.replace(/\D/g, '');
			var temp = parseInt($scope.data.selectedContacts[i].phones[0].value);
			$scope.data.selectedContacts[i].phones[0].value = temp;
        }		
		
        // Print the social circle name
        console.log(user.groupName);

        // Get the reference for the push
        var fbCirclePushRef = fbCircle.push();

        // Get the unique ID generated by push()
        var groupID = fbCirclePushRef.key();

        console.log("Path:" + groupID);

        // Append new data to this FB link
        fbCirclePushRef.update({
            circleName: user.groupName,
            circleID: groupID,
            plan: user.plan,
            amount: user.amount,
            groupMessage: user.groupMessage,
            contacts: $scope.data.selectedContacts
        });

		// Writing circle ID to the user's path and set Status to true
		fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child(groupID).update({
			Status: true
		});
		
		// Writing UserID under CircleID and set Status to true
		fbRef.child("Circles").child(groupID).child("Members").child($rootScope.fbAuthData.uid).update({
			Status: true
		});
		
     // Checking for registered users and generating new Circle invite codes for non-registered users
        for (var i = 0; i < $scope.data.selectedContacts.length; i++){
	        
	        // This makes sure variable i is available for the callback function
	        (function(i){
	            // Use the user's email address and set the id length to be 4
	            var hashids = new Hashids("SecretMonkey", 4);
	            console.log("Phones:   " + $scope.data.selectedContacts[i].phones[0].value);
	            var id = hashids.encode($scope.data.selectedContacts[i].phones[0].value);
	            console.log("Hashids: " + hashids + id);
	
	            // Get the link to the Registered User
	            var fbHash = new Firebase(fbRef + "/RegisteredUsers/" + id);
	            console.log("User LINK: " + fbHash);
	            
	            var to = $scope.data.selectedContacts[i].emails[0].value;
			    var name = $scope.data.selectedContacts[i].displayName;
			    var groupName = user.groupName;     
	            // Callback function to obtain user info
		        fbCallback.fetch(fbHash, function(data) {
	            	// Check if invited user is registered with WalletBuddies
		            if (data != null){
			            console.log("Invited user is registered with uid: " + data.uid);
			            // Writing UserID under CircleID and set Status to pending
						fbRef.child("Circles").child(groupID).child("Members").child(data.uid).update({
							Status: "pending"
						});
						
						// Writing circle ID to the user's path and set Status to pending
						fbRef.child("Users").child(data.uid).child("Circles").child(groupID).update({
							Status: "pending"
						});				
		            }
		            	// Push email invite if user is not registered
					else {
						console.log("Invited user is not registered, push email invites.");
						// Get the link to the Registered User
						var fbInvites = new Firebase(fbRef + "/Invites/" + id);
						
		            	// Save the CircleId under Invites and Push the invite
			            fbInvites.update({
			                circleID: groupID
			            });
			            // SendGrid email notification
			            var api_user = "deepeshsunku";
			            var api_key = "hdG-vU7-ETH-FwS";
						
						fbCallback.fetch(fbProfile, function(output){
							fbName = output.firstname;
				        	$email.$send(api_user, api_key, to, name,
				            "You've been invited to form a Circle on WalletBuddies by " + fbName,
				            fbName + " has invited you to the " + groupName +
				            " Circle on WalletBuddies. Use the code: " + id +
				            " to join this Circle. Have fun. :)", "deepesh.sunku@walletbuddies.co");
				            console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + to);				            
			            });
		            }
	            });
        	})(i);
        }

        // Clear the forms
        user.groupName = "";
        user.plan = "weekly";
        user.amount = 0;
        user.groupMessage = "";

        // Go to the wallet page
        $state.go('tab.wallet');
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
.controller('SignInCtrl', ['$scope', '$state', '$rootScope', 'Circles',
    function($scope, $state, $rootScope, Circles) {
        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

        $scope.user = {
            email: "",
            password: "",
            token: ""
        };

        // Called when the user clicks the "Sign In" button
        $scope.validateUser = function() {
            var email = this.user.email;
            var password = this.user.password;
            var token = this.user.token;

            if (!email || !password) {
                alert("Please enter valid credentials.");
                return false;
            }

            // Authorize the user with email/password
            fbRef.authWithPassword({
                    email: email,
                    password: password
                },
                function(error, authData) {
                    if (error) {
                        alert("Login Error! Try again.");
                    } else {
                        console.log("Sign In successful");
						// Saving auth data to be used across controllers
						$rootScope.fbAuthData = authData;
						
                        // Hard coded to be false
                        if( false ){
                            var fbInvites = new Firebase(fbRef + "/Invites/" + token);
                            console.log("Token Hmmm: " + token);
							
                             // Use the user's email address and set the id length to be 4
                            hashids = new Hashids("first@last.com", 4);

                             // Hard code the invite code for now
                            //var inviteEntered = "8wXlb6w";

                            // Use the user's phone number(hard coded for now)
                            //var decodedID = hashids.decode(inviteEntered);

                            //console.log("DecodedID:" + decodedID);

                            // Retrieve all the invites and compare it against the code
                            fbInvites.on("child_added", function(snapshot) {
                                var inviteVal = snapshot.val();
                                var inviteKey = snapshot.key();
                                console.log("Key:" + inviteKey);
                                console.log("inviteVal.inviteCode = " + inviteKey + " Val: " + inviteVal[0]);

                                //if(token == inviteKey) {//&& (decodedID == "1234567891")){
                                    console.log("CircleID: " + inviteVal.circleID);
                                    //console.log("GroupName: " + inviteVal.circleName);

                                    // Copy the circle ID
                                    circleIDMatched = inviteVal.circleID;

                                    // Get the link to the Circles of the User
                                    var fbCircle = new Firebase(fbRef + "/Circles/");

                                    // Create an array which stores all the information
                                    var circlesArray = [];
                                    var loopCount = 0;

                                    // Retrieve all the social circles under this user
                                    // Note: This callback occurs repeatedly till all the "children" are parsed
                                    fbCircle.on("child_added", function(snapshot) {
                                      var circleVal = snapshot.val();

                                      // Display the Circle which matched
                                      if(circleVal.circleID == circleIDMatched){
                                          circlesArray.push(circleVal)
                                          console.log("Name: " + circlesArray[loopCount].circleName);
                                          console.log("GroupID: " + circlesArray[loopCount].circleID);
                                          console.log("Plan: " + circlesArray[loopCount].plan);
                                          console.log("Amount: " + circlesArray[loopCount].amount);
                                          console.log("Message: " + circlesArray[loopCount].groupMessage);
                                          loopCount++;
                                          console.log("Number of circles:" + loopCount);
                                      }

                                      // Code for deleting the invite after providing access
                                      //var fbInvite = new Firebase(fbRef + "/Invites/" + inviteKey);
                                      //fbInvite.remove();
                                    });

                                    // Length will always equal count, since snap.val() will include every child_added event
                                    // triggered before this point
                                    fbCircle.once("value", function(snap) {
                                         // Use the setter and set the value so that it is accessible to another controller
                                        Circles.set(circlesArray);
                                        // The data is ready, switch to the Wallet tab
                                        $state.go('tab.wallet');
                                    });
                                //}
                            });
                        }
                        else{
                            // Get the link to the Circles of the User
                            var fbCircle = new Firebase(fbRef + "/Circles/");

                            // Create an array which stores all the information
                            var circlesArray = [];
                            var loopCount = 0;

                             // Retrieve all the social circles under this user
                             // Note: 1. This callback occurs repeatedly till all the "children" are parsed
                             // MSP: We need to change this so that it displays only social circles which the user is part of
                            fbCircle.on("child_added", function(snapshot) {
                              var circleVal = snapshot.val();
                              circlesArray.push(circleVal)
                              console.log("Name: " + circlesArray[loopCount].circleName);
                              console.log("GroupID: " + circlesArray[loopCount].circleID);
                              console.log("Plan: " + circlesArray[loopCount].plan);
                              console.log("Amount: " + circlesArray[loopCount].amount);
                              console.log("Message: " + circlesArray[loopCount].groupMessage);
                              loopCount++;
                              console.log("Number of circles:" + loopCount);
                            });

                            // Length will always equal count, since snap.val() will include every child_added event
                            // triggered before this point
                            fbCircle.once("value", function(snap) {
                                // Use the setter and set the value so that it is accessible to another controller
                                Circles.set(circlesArray);
                                // The data is ready, switch to the Wallet tab
                                $state.go('tab.wallet');
                            });
                        }
                    }
                }
            );
        }

        // Clear the forms
        $scope.user.email = "";
        $scope.user.password = "";
        $scope.user.token = "";
    }
])


// Other unfilled and unused controllers
.controller('ChatsCtrl', function($scope, Chats, Circles) {
    // Make sure the data is available in this controller
    $scope.circles = Circles.get();
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
