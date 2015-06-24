angular.module('starter.controllers', [])

// Controller for Account Creation and Sign Up
.controller('AccountCtrl', function($scope, $firebaseObject, $state, $rootScope, $log, Circles, $firebaseAuth, $http) {
    // Function to do the Sign Up and Add the Account
    $scope.addAccount = function(account) {
        // Make sure all the fields have a value
        if (!account.email || !account.password || !account.firstname || !account.lastname || !account.phonenumber) {
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
                        $rootScope.fbAuthData = authData;
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
					    var fbHashRef = new Firebase(fbRef + "/RegisteredUsers/");
					    fbHashRef.child(id).update({
							uid: authData.uid
                        });
						
						// Check to see if user has invites
						var fbInvites = new Firebase(fbRef + "/Invites/" + id);
						// If invites exist write circle data to User's path
						if (fbInvites != null) {
							var obj = $firebaseObject(fbInvites);
							
							obj.$loaded().then(function() {
						        console.log("loaded record:", obj.$id);
						
						        // To iterate the key/value pairs of the object, use angular.forEach()
						        angular.forEach(obj, function(value, key) {
						          console.log(key, value);
						          var circleID = value;
						          console.log("Invites path: " + fbInvites + circleID);
						          fbRef.child("Circles").child(circleID).once('value', function(data) {
							          fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child(circleID).update({
									  	Status: "pending",
									  	circleName: data.val().circleName,
										plan: data.val().plan,
							            amount: data.val().amount,
							            invitorName: data.val().invitorName
								  	  });
						          });
						        })
						    })
						}
						
                        // Write email info to /Sendgrid folder to trigger the server to send email
                        fbRef.child('Sendgrid').push({
							from: 'hello@walletbuddies.co', 
							to: account.email, 
							subject: account.firstname + "! You're all set.", 
							text: "Thanks for signing up with Wallet Buddies, you can now start saving with your buddies - we hope you have fun saving :)" +
                        "\n\n Team Wallet Buddies"
						});
						
                        alert("User created successfully");
						
						// Create a SynapsePay user account
						$http.post('https://sandbox.synapsepay.com/api/v3/user/create', {
						    "client": {
							    //your client ID and secret
							    "client_id": "8i4Yl1BVmblUBBpIZTNM",  
							    "client_secret": "MudcA6qyaVvpop2f5ACCCLyll32Ps15HtTyYQLsi"
							  },
							  "logins": [
							    //email and password of the user. Passwords are optional.
							    //yes you can add multiple emails and multiple users for one account here
							    {
							      "email": account.email,
							      "read_only":false
							    }
							  ],
							  "phone_numbers": [
							    //user's mobile numbers. Can be used for 2FA
							    account.phonenumber.toString()
							  ],
							  "legal_names": [
							    //user's legal names. If multiple user's are being added, add multiple legal names.
							    //If business account, add the name of the person creating the account and the name of the company
							    account.firstname + " " + account.lastname
							  ],
							  "fingerprints": [
							    //fingerprints of the devices that you will be accessing this account from
							    {
							      "fingerprint": "suasusau21324redakufejfjsf"
							    }
							  ],
							  "ips": [
							    //user's IP addresses
							    "192.168.1.1"
							  ],
							  "extra": {
								//optional fields
							    "note": "WalletBuddies User",
							    "supp_id": "No IDs Here",
							    //toggle to true if its a business account
							    "is_business": false
							  }
			            }).then(function(response) {
							fbUser.child("Payments").update({
							  oauth: response.data.oauth, // We need this for making bank transactions, every user has a unique key.
							  client_id: response.data.user.client.id,
							  fingerprint: "suasusau21324redakufejfjsf"
							});
						  
						}).catch(function(err) {
						  console.log("An error occured while communicating with Synapse");
						  console.log(err);
						});
						// Clear the form
				        $account.firstname = '';
				        account.lastname = '';
				        account.email = '';
				        account.phonenumber = '';
				        account.password = '';

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
.controller('GroupCtrl', function($scope, $firebaseObject, ContactsService, fbCallback, $cordovaContacts, $rootScope, $state, $log, $ionicPopup) {
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
		
        //  Loop for removing symbols in phone numbers
        for( var i = 0; i < $scope.data.selectedContacts.length; i++){
            var str = $scope.data.selectedContacts[i].phones[0].value;
            console.log("Before str.replace: " + $scope.data.selectedContacts[i].phones[0].value);
			$scope.data.selectedContacts[i].phones[0].value = str.replace(/\D/g, '');
			console.log("After str.replace: " + $scope.data.selectedContacts[i].phones[0].value);
			var temp = parseInt($scope.data.selectedContacts[i].phones[0].value);
			$scope.data.selectedContacts[i].phones[0].value = temp;
        }		
		
        // Print the social circle name
        console.log(user.groupName);
		var groupName = user.groupName;
        // Get the reference for the push
        var fbCirclePushRef = fbCircle.push();

        // Get the unique ID generated by push()
        var groupID = fbCirclePushRef.key();
		
		fbRef.child("Users").child($rootScope.fbAuthData.uid).once('value', function(userData) {
			// Append new data to this FB link
	        fbCirclePushRef.update({
	            circleName: user.groupName,
	            circleID: groupID,
	            plan: user.plan,
	            amount: user.amount,
	            groupMessage: user.groupMessage,
	            contacts: $scope.data.selectedContacts,
	            invitorName: userData.val().firstname
	        });
		});

		// Writing circle ID to the user's path and set Status to true
		fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child(groupID).update({
			Status: true,
			circleName: user.groupName,
			plan: user.plan,
            amount: user.amount
		});
		
		// Writing UserID under CircleID and set Status to true
		fbRef.child("Circles").child(groupID).child("Members").child($rootScope.fbAuthData.uid).update({
			Status: true
		});
		
		// Save the timestamp to trigger the circle-start-scheduler
		var date = Firebase.ServerValue.TIMESTAMP;
		console.log("Firebase.ServerValue.TIMESTAMP" + date);
		fbRef.child('StartDate').push({
			date: date,
			circleID: groupID,
			plan: user.plan,
			amount: user.amount
		});
		
     // Checking for registered users and generating new Circle invite codes for non-registered users
        for (var i = 0; i < $scope.data.selectedContacts.length; i++){
	        
	        // This makes sure variable i is available for the callback function
	        (function(i){
	            // Use the secret key and set the id length to be 4
	            var hashids = new Hashids("SecretMonkey", 4);
	            console.log("Phones:   " + $scope.data.selectedContacts[i].phones[0].value);
	            var id = hashids.encode($scope.data.selectedContacts[i].phones[0].value);
	            console.log("Hashids: " + hashids + id);
	
	            // Get the link to the Registered User
	            var fbHash = new Firebase(fbRef + "/RegisteredUsers/" + id);
	            console.log("User LINK: " + fbHash);
	               
	            // Callback function to obtain user info
		        fbCallback.fetch(fbHash, function(data) {
	            	// Check if invited user is registered with WalletBuddies
		            if (data != null){
			            console.log("Invited user is registered with uid: " + data.uid);
			            // Writing UserID under CircleID and set Status to pending
						fbRef.child("Circles").child(groupID).child("Members").child(data.uid).update({
							Status: "pending"
						});
						
						fbRef.child("Users").child($rootScope.fbAuthData.uid).once('value', function(userData) {
							// Writing circle ID to the user's path and set Status to pending
							fbRef.child("Users").child(data.uid).child("Circles").child(groupID).update({
								Status: "pending",
								circleName: user.groupName,
								plan: user.plan,
					            amount: user.amount,
					            invitorName: userData.val().firstname
							});
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
			            
			            // Save data for sending email notification
			            var email = $scope.data.selectedContacts[i].emails[0];
			            var phone = $scope.data.selectedContacts[i].phones[0];
						
						fbCallback.fetch(fbProfile, function(output){
							fbName = output.firstname;
							// Check if user has phonenumber only or email only or both
							if (email && phone) {
								// Write email info to /Sendgrid folder to trigger the server to send email
		                        fbRef.child('Sendgrid').push({
									from: 'hello@walletbuddies.co', 
									to: email.value, 
									subject: "You've been invited to form a Circle on WalletBuddies by " + fbName, 
									text: fbName + " has invited you to the " + groupName + " Circle on WalletBuddies. Click here: www.walletbuddies.com to join this Circle. Have fun. :)"
								});
					            console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + email.value);
							}
							else if (email) {
								// Write email info to /Sendgrid folder to trigger the server to send email
		                        fbRef.child('Sendgrid').push({
									from: 'hello@walletbuddies.co', 
									to: email.value, 
									subject: "You've been invited to form a Circle on WalletBuddies by " + fbName, 
									text: fbName + " has invited you to the " + groupName + " Circle on WalletBuddies. Click here: www.walletbuddies.com to join this Circle. Have fun. :)"
								});
					            console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + email.value);	
							}
							else {
								// Write email info to /Sendgrid folder to trigger the server to send email
		                        fbRef.child('Twilio').push({ 
									to: phone.value, 
									text: fbName + " has invited you to the " + groupName + " Circle on WalletBuddies. Click here: www.walletbuddies.com to join this Circle. Have fun. :)"
								});
					            console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + phone.value);
							}				            
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
		
		$ionicPopup.alert({
		    title: "Whooosh!",
			template: "Your invites are on their way. :)"
	    });
		
        // The data is ready, switch to the Wallet tab
        $state.go('tab.wallet');

    }

})

// Controller for requests tab
.controller('RequestsCtrl', function($scope, CirclesTest, $firebaseArray, $firebaseObject, $rootScope) {
	
	/*
	// Get a reference to the Firebase account
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
    // Get a reference to where the User's circle IDs are stored
	var fbUserCircle = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/Circles/");
	var fbCircles = new Firebase(fbRef + "/Circles/");
	//var circlesArray = $firebaseArray(fbCircles);
	console.log("REQUESTCTRL");
	fbUserCircle.orderByChild("Status").equalTo("pending").on('child_added', function(indexSnap) {
		console.log("INSIDE QUERY " + indexSnap.key());
		var query = fbCircles.orderByChild("circleID").equalTo(indexSnap.key());
		$scope.circles = $firebaseArray(query);
	});   
	*/
	
	$scope.circles = CirclesTest.get();	
})

// Controller for requests-detail page
.controller('RequestsDetailCtrl', function($scope, $stateParams, $firebaseObject, $rootScope, $state, $ionicPopup) {
	// Get a reference to the Firebase account
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
		
	var fbCircles = new Firebase(fbRef + "/Circles/" + $stateParams.circleID);
	var obj = $firebaseObject(fbCircles);
	obj.$loaded().then(function() {
        console.log("loaded record for CircleId:", obj.$id);

        // To iterate the key/value pairs of the object, use angular.forEach()
        angular.forEach(obj, function(value, key) {
          console.log(key, value);
        })
    })
    obj.$bindTo($scope, "circle");
    
    // Called when user clicks "Accept"
    $scope.onAccept = function() {
	    var fbUser = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid);
	    fbUser.once("value", function(data) {
		    // Check if user's bank account is linked and KYC info verified before the user can accept an invite
		    if (data.child("Payments/Bank").exists() && data.child("Payments/KYC").exists()) {
				// Change Status of the circle to "true"
			    fbRef.child("Circles").child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
				    Status: true
			    });
			    
			    fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child($stateParams.circleID).update({
					Status: true
				});
				$state.go('tab.requests');
		    }
		    else {
			    $ionicPopup.alert({
				    title: "You haven't linked your bank account yet!",
					template: "You can accept a request once you've linked an account. Please go to settings to link an account."
			    });
		    }
	    });
    }
    
    // Called when user clicks "Decline"
    $scope.onDecline = function() {
	    // Change Status of the circle to "false"
	    fbRef.child("Circles").child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
		    Status: false
	    });
	    
	    // Remove the circle from the User's circle path
	    fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child($stateParams.circleID).remove();		
		
		// Send email notification to circle creator & user confirming decline (Currently only sending to the user)
		fbRef.child("Circles").child($stateParams.circleID).once('value', function(data) {
	        fbRef.child('Sendgrid').push({
				from: 'hello@walletbuddies.co', 
				to: $rootScope.fbAuthData.password.email, 
				subject: "Confirmation from WalletBuddies", 
				text: "This message is to confirm that you have declined to join the Circle " + data.val().circleName + ". \n\n- WalletBuddies"
			});
		});
		$state.go('tab.requests');
    }  
})

// Controller for tab-settings
.controller('SettingsCtrl', function($scope, $ionicHistory, $ionicNavBarDelegate, $state) {
	// Create a firebase reference
	var ref = new Firebase("https://walletbuddies.firebaseio.com");
	
	// Go to tab-account
	$scope.account = function() {
		$state.go("tab.account");
	}; 
	
	// Signout from the app
	$scope.signOut = function() {
		ref.unauth();
		$state.go('launch');
		//$scope.$on('$ionicView.afterLeave', function(){
		$ionicHistory.clearCache();
	    $ionicHistory.clearHistory();
	    //$ionicNavBarDelegate.showBackButton(false);
	    console.log("History" + JSON.stringify($ionicHistory.viewHistory()));
		//});
    };
})

// Controller for tab-Account 
.controller('ConnectCtrl', function($scope, $state, $stateParams, $rootScope, $firebaseArray, $http, $ionicPopup, $ionicHistory, $ionicNavBarDelegate) {
	//console.log("History before signout: " + $ionicHistory.viewHistory());
    $scope.user = {
        type: '',
        username: 'synapse_nomfa',
        password: 'test1234'
    };

	var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid);
	var ref = new Firebase("https://walletbuddies.firebaseio.com");

	/*
	$http.get('https://sandbox.synapsepay.com/api/v2/bankstatus/show').then(function(response) {
		$scope.institutions = response.data.banks;
		console.log(JSON.stringify(response.data.banks));
	}).catch(function(err) {
	  console.log("Got an error in list of banks.");
	  console.log(err);
	  alert(err.statusText);
	});
	*/
	
	// List of supported institutions
	$scope.institutions = {
		"banks": [{"bank_name":"Ally","date":"2015-06-04T22:50:10.628919","id":"ally","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/ally.png","resource_uri":"/api/v2/bankstatus/11/","status":"Active"},{"bank_name":"First Tennessee","date":"2015-06-04T22:50:11.579320","id":"firsttennessee","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/first_tn.png","resource_uri":"/api/v2/bankstatus/12/","status":"Active"},{"bank_name":"TD Bank","date":"2015-06-04T22:50:14.312727","id":"td","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/td.png","resource_uri":"/api/v2/bankstatus/13/","status":"Active"},{"bank_name":"BB&T Bank","date":"2015-06-04T22:50:14.316785","id":"bbt","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/bbt.png","resource_uri":"/api/v2/bankstatus/16/","status":"Active"},{"bank_name":"Bank of America","date":"2015-06-04T22:50:00.069431","id":"bofa","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/bofa.png","resource_uri":"/api/v2/bankstatus/1/","status":"Active"},{"bank_name":"Chase","date":"2015-06-04T22:50:00.073254","id":"chase","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/chase.png","resource_uri":"/api/v2/bankstatus/2/","status":"Active"},{"bank_name":"Wells Fargo","date":"2015-06-04T22:50:00.076002","id":"wells","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/wells_fargo.png","resource_uri":"/api/v2/bankstatus/3/","status":"Active"},{"bank_name":"Citibank","date":"2015-06-04T22:50:00.078971","id":"citi","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/citi.png","resource_uri":"/api/v2/bankstatus/4/","status":"Active"},{"bank_name":"US Bank","date":"2015-06-04T22:50:00.081610","id":"us","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/usbank.png","resource_uri":"/api/v2/bankstatus/5/","status":"Active"},{"bank_name":"USAA","date":"2015-06-04T22:50:00.084672","id":"usaa","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/usaa.png","resource_uri":"/api/v2/bankstatus/6/","status":"Active"},{"bank_name":"Charles Schwab","date":"2015-06-04T22:50:00.087398","id":"schwab","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/charles_schwab.png","resource_uri":"/api/v2/bankstatus/7/","status":"Active"},{"bank_name":"Capital One 360","date":"2015-06-04T22:50:00.090046","id":"capone360","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/cap360.png","resource_uri":"/api/v2/bankstatus/8/","status":"Active"},{"bank_name":"PNC","date":"2015-06-04T22:50:00.092713","id":"pnc","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/pnc.png","resource_uri":"/api/v2/bankstatus/14/","status":"Active"},{"bank_name":"Fidelity","date":"2015-06-04T22:50:00.095358","id":"fidelity","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/fidelity.png","resource_uri":"/api/v2/bankstatus/15/","status":"Active"},{"bank_name":"Regions","date":"2015-06-04T22:50:04.796854","id":"regions","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/regionsbank.png","resource_uri":"/api/v2/bankstatus/9/","status":"Active"},{"bank_name":"SunTrust","date":"2015-06-04T22:50:10.625099","id":"suntrust","logo":"https://s3.amazonaws.com/synapse_django/bank_logos/suntrust.png","resource_uri":"/api/v2/bankstatus/10/","status":"Active"}]
	}

    $scope.connect = function(user) {
	    console.log("Bank ID: " + user.id);
		fbRef.child("Payments").once('value', function(data) {
			// $http post for Bank Login
			$http.post('https://sandbox.synapsepay.com/api/v3/node/add', {
			    'login':{
				    'oauth_key': data.val().oauth.oauth_key
				  },
				  'user':{
				    'fingerprint':'suasusau21324redakufejfjsf'
				  },
				  'node':{
				    'type':'ACH-US',
				    'info':{
				      'bank_id': user.username,
				      'bank_pw': user.password,
				      'bank_name': user.id,
				    }
				}
            }).then(function(payload) {
	            // Clear the forms
			    $scope.user = {
			        type: '',
			        username: '',
			        password: ''
			    };
	            console.log("Payload " + payload.data.success);
				if (payload.data.success) {
				    if (payload.data.nodes[0].allowed == null) {
						console.log("MFA QUESTION: " + JSON.stringify(payload.data));
						$rootScope.question = payload.data;
						$state.go('tab.auth-question');			         
				    }
				    else {
						console.log("Bank Account Details: " + JSON.stringify(payload.data));
			            $rootScope.data = payload.data;
			            $state.go('tab.choose-account');
				    }
				}
			}).catch(function(err) {
			  console.log("Got an error in bank login.");
			  console.log(err);
			  alert(err.statusText);
			});
		});
    };

    /*
    // Test code for making a transaction
    $scope.testDebit = function() {
	    fbRef.child("Payments").once('value', function(data) {
		    $http.post('https://sandbox.synapsepay.com/api/v3/trans/add', {
			  'login':{
			    'oauth_key': data.val().oauth.oauth_key
			  },
			  'user':{
			    'fingerprint':'suasusau21324redakufejfjsf'
			  },
			  'trans':{
			      //where you wish to debit funds from. This should belong to the user who's OAUTH key you have supplied in login
			      'from':{
			      'type': data.val().Bank.type,
			      'id': data.val().Bank.oid
			  	  },
				  //where you wish to send funds to
				  'to':{
				      'type':'ACH-US',
				      'id': '557f7a7186c2736fb1c60c09'
				  },
				  'amount':{
				      //'amount': (11).toFixed(2),
				      'amount': parseFloat("10.11"),
				      'currency':'USD'
				  },
				  //process on lets you supply the date when you wish to process this transaction. This is delta time, which means 1 for tomorrow, 2 means dayafter, and so on
				  //Finally the IP address of the transaction
				  'extra':{
				      'supp_id':'',
				      'note':'Debited from WB user',
				      'webhook':'',
				      'process_on':0,
				      'ip':'192.168.1.1',
				  },
				  //this lets you add a facilitator fee to the transaction, once the transaction settles, you will get a part of the transaction
				  'fees':[{
				      'fee': parseFloat(fee + ".01"),
				      'note':'Facilitator Fee',
				      'to':{
				        'id':'557f7a7186c2736fb1c60c09'
				      }
				  }]
			  }
		    }).then(function(payload) {
			    console.log("Transaction Successful with and with deatils: " + JSON.stringify(payload.data));
			    $ionicPopup.alert({
				    title: "Did it happen?",
				    template: "You tell me!... INCOMING DATA: " + JSON.stringify(payload.data)
				})
		    }).catch(function(err) {
			    console.log("Got an error in transaction");
			    console.log(JSON.stringify(err));
			    console.log(err);
			    alert(err.statusText);
		    });
	    
	    })
    };
    
    $scope.viewTran = function() {
	    fbRef.child("Payments").once('value', function(data) {
		    $http.post('https://sandbox.synapsepay.com/api/v3/trans/show', {
			  'login':{
			    'oauth_key': data.val().oauth.oauth_key
			  },
			  'user':{
			    'fingerprint':'suasusau21324redakufejfjsf'
			  }
			  //this is all optional stuff. You can provide one field or all.
			  //Filter object allows you to filter information the way you see fit
			  
  		    }).then(function(payload) {
			    console.log("Transaction Successful with and with deatils: " + JSON.stringify(payload.data));
			    $ionicPopup.alert({
				    title: "Did it happen?",
				    template: "You tell me!... INCOMING DATA: " + JSON.stringify(payload.data)
				})
		    }).catch(function(err) {
			    console.log("Got an error in transaction");
			    console.log(JSON.stringify(err));
			    alert(err.statusText);
		    });
	    
	    })
    };
    
    $scope.signOut = function () {
	    $ionicHistory.clearCache();
	    $ionicHistory.clearHistory();
	    $ionicNavBarDelegate.showBackButton(false);
	    console.log("History" + $ionicHistory.viewHistory());
	    ref.unauth();
	    $state.go('launch');
    };
    */
})

// Controller for Choose-Account
.controller('ChooseAccCtrl', function($scope, $rootScope, $state, $ionicPopup) {

	$scope.data = $rootScope.data;
	
	$scope.checkSelect = function(index) {
		console.log('array index is ' + index);
		$scope.temp = index;
	}
	
	$scope.validateUser = function() {
		//alert("Your " + $scope.data.banks[$scope.temp].nickname + " account is now linked.");
		$ionicPopup.alert({
		    title: "Alright!",
		    template: "Your " + $scope.data.nodes[$scope.temp].info.class + " " + $scope.data.nodes[$scope.temp].info.type + " account is now linked."
		});
		var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid).child("Payments").child("Bank");
		fbRef.update({
			account_num: $scope.data.nodes[$scope.temp].info.account_num,
			routing: $scope.data.nodes[$scope.temp].info.routing_num,
			type: $scope.data.nodes[$scope.temp].type,
			oid: $scope.data.nodes[$scope.temp]._id.$oid
		});
		$state.go('tab.kyc-details');
	};
})

// Controller for providing KYC details.
.controller('KycCtrl', function($scope, $rootScope, $state, $http, $ionicPopup) {

	$scope.data = $rootScope.data;
	
	var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);
	
	$scope.user = {
        day: 26,
        month: 12,
        year: 1987,
        street: "4301 rowalt dr",
        city: "College Park",
        zip: "20740",
        ssn: 3333
    };
	
	$scope.validateUser = function(user) {
		fbRef.once("value", function(data) {
			$http.post('https://sandbox.synapsepay.com/api/v3/user/doc/add', {
				'login':{
				    'oauth_key': data.val().Payments.oauth.oauth_key
				},
				'user':{
				    'doc':{
				      'birth_day': user.day,
				      'birth_month': user.month,
				      'birth_year': user.year,
				      'name_first': data.val().firstname,
				      'name_last': data.val().lastname,
				      'address_street1': user.street,
				      'address_city': user.city,
				      'address_postal_code': user.zip,
				      'address_country_code': 'US',
				      'document_value': user.ssn.toString(),
				      'document_type':'SSN',
				    },
					'fingerprint':'suasusau21324redakufejfjsf'
			    }
			}).then(function(payload) {
				console.log("KYC response " + payload.data.message.en);
				console.log(JSON.stringify(payload.data));
				if (payload.data.message.en == "SSN information verified") {
					$ionicPopup.alert({
					    title: "You're all set!",
					    template: "Your verification is complete"
					});
					$state.go("tab.settings");
				}
				else {
					$ionicPopup.alert({
					    title: "We need a little more info from you",
					    template: "Please bear with us :)"
					});
					$rootScope.kycQuestions = payload.data;
					$state.go("tab.kyc-questions");
				}
			}).catch(function(err) {
				console.log(err);
				console.log(JSON.stringify(err));
				alert(err.statusText);
			});
		});
	};
})

// Controller for Choose-Account
.controller('KycQuestionCtrl', function($scope, $rootScope, $state, $http, $ionicPopup) {

	$scope.data = $rootScope.kycQuestions.question_set;
	console.log("Questions: ", $scope.data.questions);
	$scope.selection = {};
	
	$scope.validate = function() {
		var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);
		fbRef.child("Payments").once('value', function(data) {
			$http.post('https://sandbox.synapsepay.com/api/v3/user/doc/verify', {
				'login':{
				    'oauth_key': data.val().oauth.oauth_key
				},
				'user':{
				    'doc':{
				      'question_set_id': $scope.data.id,
				      'answers':[
				        { 'question_id': 1, 'answer_id': $scope.selection.answer[1] },
				        { 'question_id': 2, 'answer_id': $scope.selection.answer[2] },
				        { 'question_id': 3, 'answer_id': $scope.selection.answer[3] },
				        { 'question_id': 4, 'answer_id': $scope.selection.answer[4] },
				        { 'question_id': 5, 'answer_id': $scope.selection.answer[5] }
				      ]
				    },
				    'fingerprint':'suasusau21324redakufejfjsf'
				}
			}).then(function(payload) {
				console.log("KYC Questions Response: " + JSON.stringify(payload.data));
				$ionicPopup.alert({
					    title: "You're all set!",
					    template: "Your SSN information was verified."
				});
				fbRef.child("Payments").child("KYC").update({
					oid: payload.data.user._id.$oid,
					clientid: payload.data.user.client.id
				});
				$state.go("tab.settings");
			}).catch(function(err) {
				console.log("Got an error in MFA - QuestionCtrl.");
				console.log(err);
				console.log("Error Message in JSON: " + JSON.stringify(err));
				
				// Popup for wrong answer
				if (err.status == 400) {
					$ionicPopup.alert({
					    title: "Wrong Answer!",
					    template: "Please try again."
					});
				}
				else {
					alert(err.statusText);  
				}
			})
		});
	};
})

// Controller for Auth-Question page
.controller('QuestionCtrl', function($scope, $rootScope, $state, $http, $ionicPopup) {

	$scope.question = $rootScope.question;
	console.log("QUESTION: " + $scope.question.nodes[0].extra.mfa.message);
	$scope.authStep = function (user) {
			var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);
			fbRef.child("Payments").once('value', function(data) {
				console.log("POST DATA: " + data.val().oauth.oauth_key +" "+$scope.question.nodes[0]._id.$oid+" "+ user.answer);
				$http.post('https://sandbox.synapsepay.com/api/v3/node/verify', {
	                'login':{
				    'oauth_key': data.val().oauth.oauth_key
				  },
				  'user':{
				    'fingerprint':'suasusau21324redakufejfjsf'
				  },
				  'node':{
					  '_id':{
						  '$oid': $scope.question.nodes[0]._id.$oid
					  },
					  'verify':{
						  'mfa': user.answer
				  	  }
				  }
	            }).then(function(payload) {
		            console.log("Bank Account Details: " + JSON.stringify(payload.data));
		            $rootScope.data = payload.data;
		            $state.go('tab.choose-account');
	            }).catch(function(err) {
				  console.log("Got an error in MFA - QuestionCtrl.");
				  console.log(err);
				  console.log("Error Message in JSON: " + JSON.stringify(err));
				  
				  // Popup for wrong answer
				  if (err.status == 400) {
					$ionicPopup.alert({
					    title: "Wrong Answer!",
					    template: "Please try again."
					});
				  }
				  else {
					alert(err.statusText);  
				  }
				});
            })
	}
	$scope.user = {
        answer: ''
    };
})

// Controller for Auth-Question page
.controller('MFACtrl', function($scope, $rootScope, $state, $http, $ionicPopup) {

	$scope.mfa = $rootScope.mfa;
	$scope.authStep = function (user) {
			var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);
			fbRef.once('value', function(data) {
				$http.post('https://sandbox.synapsepay.com/api/v2/bank/mfa', {
	                access_token: $scope.mfa.response.access_token,
				    mfa: user.answer,
				    bank: $rootScope.bank,
				    oauth_consumer_key: data.val().oauthkey
	            }).then(function(payload) {
		            console.log("Bank Account Details: " + JSON.stringify(payload.data));
		            $rootScope.data = payload.data;
		            $state.go('tab.choose-account');
	            }).catch(function(err) {
				  console.log("Got an error in MFA - QuestionCtrl.");
				  console.log(err);
				  
				  // Popup for wrong answer
				  if (err.status == 400) {
					$ionicPopup.alert({
					    title: "Wrong Code!",
					    template: "Please try again."
					});
				  }
				  else {
					alert(err.statusText);  
				  }
				});
            })
	}
	$scope.user = {
        answer: ''
    };
})

// Controller for Sign In
.controller('SignInCtrl', ['$scope', '$state', '$rootScope', 'fbCallback', 'Circles', 'CirclesTest',
    function($scope, $state, $rootScope, fbCallback, Circles, CirclesTest, $ionicHistory) {

        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
	
        $scope.user = {
            email: "sunku@fb.com",
            password: "deepesh"
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
						$state.go('tab.wallet');
                    }
                }
            );
        }

        // Clear the forms
        //$scope.user.email = "";
        //$scope.user.password = "";
    }
])


// Other unfilled and unused controllers
.controller('WalletCtrl', function($scope, $state, $rootScope, $firebaseArray, $ionicPopup) {
    
    // Create a firebase reference
    var fbUserCircle = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid + "/Circles/");
    // Filter circles with a true status
    var query = fbUserCircle.orderByChild("Status").equalTo(true);
    // Create a synchronized array
    $scope.circles = $firebaseArray(query);
    
    // Check if user has a bank account linked
    $scope.newCircle = function () {
	    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid);
	    fbRef.once("value", function(data) {
		    // Check if user's bank account is linked and KYC verified
		    if (data.child("Payments/Bank").exists() && data.child("Payments/KYC").exists()) {
			    $state.go("tab.socialcircle");
		    }
		    else {
			    $ionicPopup.alert({
				    title: "You haven't linked your bank account yet!",
					template: "You can start a new circle once you've linked an account. Please go to settings to link an account."
			    });
		    }
	    });
    };
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

.controller('HomeCtrl', function($scope, $rootScope, $firebaseArray) {
	var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("Transactions");
	// download the data from a Firebase database reference into a (pseudo read-only) array
    // all server changes are applied in realtime
    $scope.transactions = $firebaseArray(fbRef);	
})