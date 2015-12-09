angular.module('starter.controllers', [])

// Controller for Launch page
.controller('LaunchCtrl', function($scope, $state, $rootScope, $http, $ionicHistory, fbCallback, $ionicLoading) {
    $scope.$on('$ionicView.beforeEnter', function() {
        var ref = new Firebase("https://walletbuddies.firebaseio.com/");
        var authData = ref.getAuth();

        if (authData) {
            console.log("Authenticated user with uid: ", authData.uid);

            // Saving auth data to be used across controllers
            $rootScope.fbAuthData = authData;

            // Switch to the Wallet Tab
            $state.go('tab.wallet');
        } else {
            //$ionicHistory.clearCache();
            //$ionicHistory.clearHistory();
            console.log("Not authenticated");
        }
    });
})

// Controller for Account Creation and Sign Up
.controller('AccountCtrl', function($scope, $ionicHistory, $firebaseObject, $ionicPopup, $state, $ionicLoading, $rootScope, $log, $firebaseAuth, $http, $cordovaPush, $cipherFactory, $cordovaDevice) {

    $scope.check = {
        data: false
    };
    $scope.TC = function(index) {
        console.log('array index is ' + index + $scope.check.data);
        var checked = index;
    }
    $scope.$on('$ionicView.enter', function() {
        $ionicHistory.clearCache();
        //$ionicHistory.clearHistory();
    });

    // Function to do the Sign Up and Add the Account
    $scope.addAccount = function(account) {
	    // Check if terms and conditions are accepted
		if($scope.check.data) {
	        // Make sure all the fields have a value
	        if (!account.email || !account.password || !account.firstname || !account.lastname || !account.phonenumber) {
                if(typeof analytics !== 'undefined') {
                    analytics.trackEvent('Sign up Fields', 'Not Entered', 'In AccountCtrl', 1);
                }
	        } else {
	            console.log("All fields entered");

	            // Get a reference to the Firebase account
	            var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
	            // Validating if phone number has 10 digits
	            if (account.phonenumber.length > 10) {
	                $ionicPopup.alert({
			            title: "Invalid",
			            template: "Please enter a valid 10 digit phone number."
			        });
	                return;
	            }
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
                                    if(typeof analytics !== 'undefined') {
                                        analytics.trackEvent('Email', 'In Use', 'In AccountCtrl', error.code);
                                    }
	                                alert("The new user account cannot be created because the email is already in use.");
	                                $ionicPopup.alert({
							            title: "Email Taken",
							            template: "A new account cannot be created because the email is already in use."
							        });
	                                break;
	                            case "INVALID_EMAIL":
                                    if(typeof analytics !== 'undefined') {
                                        analytics.trackEvent('Email', 'Invalid', 'In AccountCtrl', error.code);
                                    }
	                                $ionicPopup.alert({
							            title: "Invalid Email",
							            template: "Please enter a valid email."
							        });
	                                break;
	                            default:
                                    if(typeof analytics !== 'undefined') {
                                        analytics.trackEvent('Account Creation', 'Error', 'In AccountCtrl', error.code);
                                    }
	                                $ionicPopup.alert({
							            title: "Error creating user",
							            template: "Please try again later."
							        });	                        }
	                    } else {
		                    $ionicLoading.show({
			                    template: 'Creating your account...'
			                });
	                        // Get the Authorization object using the Firebase link
	                        var fbAuth = $firebaseAuth(fbRef);

	                        // Check for authorization
	                        fbAuth.$authWithPassword({
	                            email: account.email,
	                            password: account.password
	                        }).then(function(authData) {
	                            // Store information for easier access across controllers
	                            $rootScope.fbAuthData = authData;
	                            $rootScope.email = account.email;

	                            console.log("Logged in as: " + authData.uid);

	                            // Get the Firebase link for this user
	                            var fbUser = fbRef.child("Users").child(authData.uid);
	                            console.log("Link: " + fbUser);

	                            // Store the user information
	                            fbUser.update({
	                                firstname: account.firstname,
	                                lastname: account.lastname,
	                                email: account.email,
	                                phonenumber: account.phonenumber,
	                                survey: false
	                            });

	                            // Create user's unique Hash and save under the Registered Users folder
	                            // Use a secret string and set the id length to be 4
	                            var hashids = new Hashids("SecretMonkey", 4);
	                            // Use the user's phone number
	                            // Converting string to integer
	                            var temp = parseInt(account.phonenumber);
	                            account.phonenumber = temp;
	                            console.log("Phone:   " + account.phonenumber);
	                            var id = hashids.encode(account.phonenumber);
	                            console.log("ID after encode: " + id);

	                            // Write the user's unique hash to registered users and save his UID
	                            var fbHashRef = new Firebase(fbRef + "/RegisteredUsers/");
	                            fbHashRef.child(id).update({
	                                uid: authData.uid
	                            });

	                            // Check to see if user has invites
	                            var fbInvites = new Firebase(fbRef + "/Invites/" + id);
	                            if (fbInvites != null) {
	                                var obj = $firebaseObject(fbInvites);

	                                obj.$loaded().then(function() {
	                                    console.log("loaded record:", obj.$id);

	                                    // To iterate the key/value pairs of the object, use angular.forEach()
	                                    angular.forEach(obj, function(value, key) {
	                                        console.log(key, value);
	                                        var circleID = value.circleID;
	                                        console.log("Invites path: " + fbInvites + circleID);
	                                        // Check if the invite was for a Singular or Rotational Circle
	                                        if (value.circleType == 'Singular') {
		                                        fbRef.child("Circles").child(circleID).child("PendingMembers").child(data.uid).update({
						                            Status: "pending"
						                        });
						                        fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child(circleID).update({
		                                            Status: "pending"
		                                        });
	                                        } else {
		                                        // Writing UserID under CircleID and set Status to pending
						                        fbRef.child("Circles").child(circleID).child("Members").child(data.uid).update({
						                            Status: "pending"
						                        });

		                                        fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child(circleID).update({
		                                            Status: "pending"
		                                        });
	                                        }
	                                    })
	                                })
	                            }

	                            // Write email info to /Sendgrid folder to trigger the server to send email
	                            fbRef.child('Sendgrid').push({
	                                from: 'hello@walletbuddies.co',
	                                to: account.email,
	                                subject: account.firstname + "! You're all set.",
	                                text: "Thanks for signing up with WalletBuddies. You can now start doing things more often with your buddies :)" +
	                                    "\n\n WalletBuddies"
	                            });

								var email = account.email;
								var number = account.phonenumber.toString();
								var first = account.firstname;
								var last = account.lastname;

	                            //$ionicLoading.show({template: 'Welcome! You\'re signed up!', duration:1500});
								console.log("SynapsePay User1: " + account.email, account.phonenumber.toString(), account.firstname + " " + account.lastname);
								fbRef.child('SynapsePay').once('value', function(data) {
									// Create a SynapsePay user account
									console.log("SynapsePay User: " + data.val().client_id + data.val().client_secret + email + number + first + " " + last);
									// get host ip address of client
									var json = 'http://ipv4.myexternalip.com/json';
									$http.get(json).then(function(result) {
										var ip = result.data.ip;
										var uuid = $cordovaDevice.getUUID();
										console.log("uuid: " + uuid);
										console.log("IP ADDRESS: " + ip);
			                            $http.post('https://synapsepay.com/api/v3/user/create', {
			                                "client": {
			                                    //your client ID and secret
			                                    "client_id": data.val().client_id,
			                                    "client_secret": data.val().client_secret
			                                },
			                                "logins": [
			                                    //email and password of the user. Passwords are optional.
			                                    //yes you can add multiple emails and multiple users for one account here
			                                    {
			                                        "email": email,
			                                        "read_only": false
			                                    }
			                                ],
			                                "phone_numbers": [
			                                    //user's mobile numbers. Can be used for 2FA
			                                    number
			                                ],
			                                "legal_names": [
			                                    //user's legal names. If multiple user's are being added, add multiple legal names.
			                                    //If business account, add the name of the person creating the account and the name of the company
			                                    first + " " + last
			                                ],
			                                "fingerprints": [
			                                    //fingerprints of the devices that you will be accessing this account from
			                                    {
			                                        "fingerprint": uuid
			                                    }
			                                ],
			                                "ips": [
			                                    //user's IP addresses
			                                    ip
			                                ],
			                                "extra": {
			                                    //optional fields
			                                    "note": "WalletBuddies User",
			                                    "supp_id": "No IDs Here",
			                                    //toggle to true if its a business account
			                                    "is_business": false
			                                }
			                            }).then(function(response) {
				                            console.log("SYNAPSEPAY response " + JSON.stringify(response));
			                                fbUser.child("Payments/oauth").update({
			                                    oauth_key: $cipherFactory.encrypt(response.data.oauth.oauth_key, $rootScope.fbAuthData.uid), // We need this for making bank transactions, every user has a unique key.
			                                    refresh_token: $cipherFactory.encrypt(response.data.oauth.refresh_token, $rootScope.fbAuthData.uid),
			                                    expires_at: response.data.oauth.expires_at,
			                                    expires_in: response.data.oauth.expires_in,
			                                    client_id: response.data.user.client.id,
			                                    fingerprint: uuid,
			                                    ip: ip,
			                                    oid: response.data.user._id.$oid
			                                });

			                            }).catch(function(err) {
                                            if(typeof analytics !== 'undefined') {
                                                analytics.trackEvent('SynapsePay AccountCtrl', err.statusText, err.data.error.en, 1);
                                            }
			                                console.log("An error occured while communicating with Synapse");
			                                console.log(JSON.stringify(err));
			                            });
		                            }, function(e) {
                                        if(typeof analytics !== 'undefined') {
                                            analytics.trackEvent('IP Address', 'Error Validating', 'In AccountCtrl', e);
                                        }
										alert("An error occured while validating your ip address");
									});
								})

	                            // Clear the form
	                            account.firstname = '';
	                            account.lastname = '';
	                            account.email = '';
	                            account.phonenumber = '';
	                            account.password = '';

								var dt = Date.now();
	                            // Get a reference to the NewsFeed of the user
	                            var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");

								fbRef.child("Users").child($rootScope.fbAuthData.uid).child('Badges').update({
						            walletCounter: 0,
						            requestCounter: 0,
						            feedCounter: 1
						        });

                                // Record entry into Account Controller
                                if(typeof analytics !== 'undefined') {
                                    analytics.trackView("Account Controller");
                                    analytics.trackEvent('AccountCtrl', 'Pass', 'In AccountCtrl', 113);
                                }

	                            var feedToPush = "Welcome to <b>WalletBuddies</b>, your account was succesfully set up!";

	                            // Append new data to this FB link
	                            fbNewsFeedRef.push({
	                                feed: feedToPush,
	                                icon: "ion-happy",
	                                color: "melon-icon",
	                                time: dt
	                            });

								$ionicLoading.hide();
	                            // Switch to the Help Sliders Tab
	                            $state.go('help');

	                            // To request permission for Push Notifications
	                            $scope.$on('$ionicView.afterLeave', function() {
	                                // Register device for push notifications
	                                if (ionic.Platform.isAndroid()) {
	                                    androidConfig = {
	                                        "senderID": "456019050509" // Project number from GCM
	                                    };
	                                    $cordovaPush.register(androidConfig).then(function(deviceToken) {
	                                        // Success -- Registration ID is received in $notificationReceiver and sent to FireBase
	                                        console.log("Success: " + deviceToken);
	                                    }, function(err) {
                                            if(typeof analytics !== 'undefined') {
                                                analytics.trackEvent('Push Notification(Android)', 'Registration Error', 'In AccountCtrl', err);
                                            }
	                                        alert("Registration error: " + err);
	                                    })
	                                } else if (ionic.Platform.isIOS()) {
	                                    var iosConfig = {
	                                        "badge": true,
	                                        "sound": true,
	                                        "alert": true,
	                                    };
	                                    $cordovaPush.register(iosConfig).then(function(deviceToken) {
	                                        // Success -- send deviceToken to FireBase
	                                        console.log("deviceToken: " + deviceToken);
	                                        fbUser.update({
	                                            deviceToken: deviceToken,
	                                            device: "iOS"
	                                        });
	                                    }, function(err) {
                                            if(typeof analytics !== 'undefined') {
                                                analytics.trackEvent('Push Notification(iOS)', 'Registration Error', 'In AccountCtrl', err);
                                            }
	                                        alert("Registration error: " + err);
	                                    });
	                                }
	                            });
	                        }).catch(function(error) {
                                if(typeof analytics !== 'undefined') {
                                    analytics.trackEvent('Authentication', 'Failed', 'In AccountCtrl', error);
                                }
	                            console.error("Authentication failed: " + error);
	                        });
	                    }
	                });
	        }
	    }
	    else {
            // User didn't accept the terms
            if(typeof analytics !== 'undefined') {
                analytics.trackEvent('Terms', 'Not Accepted', 'In AccountCtrl', 2);
            }

		    $ionicPopup.alert({
	            title: "Terms and Conditions",
	            template: "You need to agree to terms and conditions in order to continue!"
	        });
	    }
    }
})

// Controller for Forgot Password
.controller('ForgotPassCtrl', function($scope, $state, $rootScope, fbCallback, $ionicPopup) {
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

    $scope.sendTempPassword = function() {
        fbRef.resetPassword({
            email: this.user.email
        }, function(error) {
            if (error) {
                switch (error.code) {
                    case "INVALID_USER":
                        if(typeof analytics !== 'undefined') {
                            analytics.trackEvent('Forgot Password', 'Email not in the system', 'In ForgotPassCtrl', error.code);
                        }
                        $ionicPopup.alert({
                            title: "Email not in the system!",
                            template: "Please enter the right email."
                        });
                        break;
                    default:
                        if(typeof analytics !== 'undefined') {
                            analytics.trackEvent('Forgot Password', 'Error setting password', 'In ForgotPassCtrl', error.code);
                        }
                        console.log("Error resetting password:", error);
                }
            } else {
                $ionicPopup.alert({
                    title: "Temporary password sent"
                });

                // Record entry into Forgot Password Controlller
                if(typeof analytics !== 'undefined') {
                    analytics.trackView("Forgot Password Controller");
                    analytics.trackEvent('ForgotPassCtrl', 'Pass', 'In ForgotPassCtrl', 101);
                }

                $state.go('launch');
            }
        });
    }
})

// Controller for Reset Password
.controller('ResetPassCtrl', function($scope, $state, $rootScope, fbCallback, $ionicPopup) {
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

    $scope.passwordChange = function() {
        fbRef.changePassword({
            email: String($rootScope.email),
            oldPassword: this.user.oldpassword,
            newPassword: this.user.newpassword
        }, function(error) {
            if (error) {
                switch (error.code) {
                    default:
                        if(typeof analytics !== 'undefined') {
                            analytics.trackEvent('Changing Password', 'Error', 'In ResetPassCtrl', error.code);
                        }
                        console.log("Error changing password:", error);
                        $ionicPopup.alert({
		                    title: error
		                });
                }
            } else {
                $ionicPopup.alert({
                    title: "Password changed successfully!"
                });

                // Record entry into Reset Password Controlller
                if(typeof analytics !== 'undefined') {
                    analytics.trackView("Reset Password Controller");
                    analytics.trackEvent('ResetPassCtrl', 'Pass', 'In ResetPassCtrl', 102);
                }

                $state.go('tab.settings');
            }
        });
    }
})


// Controller for Sign In
.controller('SignInCtrl', ['$scope', '$ionicPopup', '$ionicHistory', '$state', '$ionicLoading', '$rootScope', 'fbCallback',
    function($scope, $ionicPopup, $ionicHistory, $state, $ionicLoading, $rootScope, fbCallback) {

        $scope.$on('$ionicView.enter', function() {
            $ionicHistory.clearCache();
            //$ionicHistory.clearHistory();
        });
        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

        $scope.user = {
            email: "",
            password: ""
        };

        $scope.goBack = function() {
            //$state.go('launch');
            console.log("HISTORY" + JSON.stringify($ionicHistory.viewHistory()));
            $ionicHistory.goBack();
        }

        // Called when the user clicks the "Forgot Password" button
        $scope.forgotPassword = function() {
            // Go to the forgot password page
            $state.go('forgotpassword');
        }

        // Called when the user clicks the "Sign In" button
        $scope.validateUser = function() {
	        $ionicLoading.show({
                template: 'Signing in..'
            });
            var email = this.user.email;
            var password = this.user.password;
            var token = this.user.token;

            if (!email || !password) {
                //alert("Please enter valid credentials.");
                $ionicLoading.hide();
                return false;
            }

            // Authorize the user with email/password
            fbRef.authWithPassword({
                    email: email,
                    password: password
                },
                function(error, authData) {
                    if (error) {
                        if(typeof analytics !== 'undefined') {
                            analytics.trackEvent('Login Error', 'Username or password incorrect', 'In SignInCtrl', error);
                        }
                        $ionicLoading.hide();
                        $ionicPopup.alert({
                            title: "Login Error",
                            template: "Username or password is incorrect. Please try again."
                        });
                    } else {
                        // Saving auth data to be used across controllers
                        $rootScope.fbAuthData = authData;
                        $rootScope.email = email;

                        // Hard coded to be false
                        if (false) {
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
                                    if (circleVal.circleID == circleIDMatched) {
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
                                    $ionicLoading.hide();
                                    // The data is ready, switch to the Wallet tab
                                    $state.go('tab.wallet');
                                });
                                //}
                            });
                        } else {
                            $ionicLoading.hide();

                            // Record entry into Sign In Controlller
                            if(typeof analytics !== 'undefined') {
                                analytics.trackView("Sign In Controller");
                                analytics.trackEvent('SignInCtrl', 'Pass', 'In SignInCtrl', 103);
                            }

                            // Switch to the Wallet tab
                            $state.go('tab.wallet');
                        }
                    }
                }
            );
        }

        // Clear the forms
        //$scope.user.email = "";
        //$scope.user.password = "";
    }
])

// Controller for submitting social circle form
.controller('GroupCtrl', function($scope, $cordovaCamera, $ionicActionSheet, $ionicLoading, $firebaseObject, $ionicModal, ContactsService, fbCallback, $cordovaContacts, $ionicScrollDelegate, $rootScope, $state, $log, $ionicPopup, $ionicFilterBar) {

    // For selecting a photo
    $scope.selectPicture = function() {
        // Show the action sheet
        var hideSheet = $ionicActionSheet.show({
            buttons: [{
                text: 'Choose Photo'
            }, {
                text: 'Take Photo'
            }],
            cancelText: 'Cancel',
            cancel: function() {
                // add cancel code..
            },
            buttonClicked: function(index) {
                if (index == 0) {
                    hideSheet();
                    var options = {
                        quality: 75,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 600,
                        targetHeight: 600,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                    }, function(err) {
                        $ionicLoading.show({
                            template: 'No Photo Selected',
                            duration: 1000
                        });
                    });
                }
                if (index == 1) {
                    hideSheet();
                    var options = {
                        quality: 75,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.CAMERA,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 600,
                        targetHeight: 600,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                    }, function(err) {
                        $ionicLoading.show({
                            template: 'No Photo Selected',
                            duration: 1000
                        });
                    });
                }
            }
        });
    };

    // For accessing the device's contacts
    $scope.data = {
        selectedContacts: []
    };

    // Import all contacts from the address book
    $scope.pickContact = function() {
	    $ionicLoading.show({
            template: 'Fetching your contacts...'
        });
	    var options = {};
		options.multiple = true;
	    $cordovaContacts.find(options).then(function(allContacts) { //omitting parameter to .find() causes all contacts to be returned
	      $scope.contacts = allContacts;
	      $scope.modal.show();
	      $ionicLoading.hide();
	    });
  	};

  	// Initialize an array to store selected contacts
  	var temp = [];

    $scope.scrollTop = function() {
        $ionicScrollDelegate.resize();
    };

  	$scope.phoneSelect = function(parentObj, Obj) {
	  	var parentIndex = $scope.contacts.indexOf(parentObj);
	  	var index = $scope.contacts[$scope.contacts.indexOf(parentObj)].phoneNumbers.indexOf(Obj);
	  	console.log("PHONE Index: ", parentIndex, index, $scope.contacts[parentIndex].phoneNumbers[index].selected);

	  	// Save the index values received when a user selects a contact
	  	if($scope.contacts[parentIndex].phoneNumbers[index].selected) {
			temp.push({
			  	parent: parentIndex,
			  	child: index
			});
	  	} else if($scope.contacts[parentIndex].phoneNumbers[index].selected == false) {
		  	for (var i = 0; i < temp.length; i++) {
			    if(parentIndex == temp[i].parent && index == temp[i].child) {
				    temp.splice(i, 1);
			    };
		    };
	  	}
  	}
  	// For determining the collection-item-length while choosing contacts
  	$scope.itemheight = function(length) {
	  	if (length == 1) {
		  	return 70;
	  	} else if (length == 2) {
		  	return 140;
	  	} else if (length == 3){
		  	return 210;
	  	} else if (length == 4){
		  	return 280;
	  	} else if (length == 5){
		  	return 350;
	  	} else {
		  	return 420;
	  	}
  	}

  	// Execute action on hide modal
	$scope.$on('modal.hidden', function(modal) {
		console.log("Hello, hidden modal", modal.id);
	    // Execute action
	    console.log("TEMP CONTACTS ARRAY: " + JSON.stringify(temp));
	    // Initialize an array for storing contacts
	    $scope.data = {
	        selectedContacts: []
	    };
	    for (var i = 0; i < temp.length; i++) {
		    if($scope.contacts[temp[i].parent].emails != null) {
			    $scope.data.selectedContacts.push({
				    name: $scope.contacts[temp[i].parent].name.formatted,
				    phone: $scope.contacts[temp[i].parent].phoneNumbers[temp[i].child].value,
				    phoneType: $scope.contacts[temp[i].parent].phoneNumbers[temp[i].child].type,
				    email: $scope.contacts[temp[i].parent].emails[0].value,
				    emailType: $scope.contacts[temp[i].parent].emails[0].type
			    });
		    } else {
				$scope.data.selectedContacts.push({
				    name: $scope.contacts[temp[i].parent].name.formatted,
				    phoneType: $scope.contacts[temp[i].parent].phoneNumbers[temp[i].child].type,
				    phone: $scope.contacts[temp[i].parent].phoneNumbers[temp[i].child].value
			    });
		    }
	    };
	    console.log("SELECTED CONTACTS: " + JSON.stringify($scope.data.selectedContacts));
	    $ionicScrollDelegate.scrollBottom(true, true);
	});

  	$ionicModal.fromTemplateUrl('contacts-modal.html', {
	    scope: $scope,
	    animation: 'slide-in-up'
	}).then(function(modal) {
	    $scope.modal = modal;
	});

    // Deleting contact selected in error
    $scope.contactDelete = function(item) {
   		$scope.data.selectedContacts.splice(item, 1);
   		temp.splice(item, 1);
    };

    // This function is called when the "Invite your wallet buddies" button is pressed
    $scope.addGroup = function(user) {
        // Save data to a local var
        var groupName = user.groupName;
        var plan = user.plan;
        var amount = user.amount;
        var groupMessage = user.groupMessage;
        var circleType = user.circleType;
        console.log(" Circle type =", circleType);

        // Check if all information is entered by the user
        if (!groupName || !plan || !amount || !groupMessage) {
            // Do nothing
        } else {
            // Get a reference to the Firebase account
            var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

            // Get the link to the Circles of the User
            var fbCircle = new Firebase(fbRef + "/Circles/");

            // Get the link to the user profile
            var fbProfile = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid);

            // Get the reference for the push
            var fbCirclePushRef = fbCircle.push();

            // Get the unique ID generated by push()
            var groupID = fbCirclePushRef.key();
            if ($scope.data.selectedContacts.length == 0) {
                $ionicPopup.alert({
                    title: "No contacts selected",
                    template: "Please select atleast one contact to create a circle."
                });
                return false;
            } else if ($scope.imageSrc == null) {
                $ionicPopup.alert({
                    title: "No circle photo",
                    template: "Add a photo to your circle. :)"
                });
            } else {
                // Use angular.copy to avoid $$hashKey being added to object
                $scope.data.selectedContacts = angular.copy($scope.data.selectedContacts);

                //  Loop for removing symbols in phone numbers
                for (var i = 0; i < $scope.data.selectedContacts.length; i++) {
                    var str = $scope.data.selectedContacts[i].phone;
                    $scope.data.selectedContacts[i].phone = str.replace(/\D/g, '');
                    var temp = $scope.data.selectedContacts[i].phone;
                    // Removing 1 from the phone number
                    if (temp.length > 10) {
                        var temp = temp.substring(1);
                        var temp_int = parseInt(temp);
                        $scope.data.selectedContacts[i].phone = temp_int;
                    }
                }

                // Append new data to this FB link
                fbCirclePushRef.update({
                    circleName: groupName,
                    circleID: groupID,
                    plan: plan,
                    amount: amount,
                    groupMessage: groupMessage,
                    contacts: $scope.data.selectedContacts,
                    circlePhoto: $scope.imageSrc,
                    circleType: circleType,
                    circleComplete: false,
                    circleCancelled: false
                });

                // Initialize the counter under CreditDates of the Circle
                fbCirclePushRef.child('CreditDates-test').child('Counter').update({
                    counter: 0
                });

                fbRef.child("Users").child($rootScope.fbAuthData.uid).once('value', function(userData) {
                    // Save invitor name photo
                    if (userData.val().profilePhoto == null) {
	                    fbCirclePushRef.update({
	                        invitorName: userData.val().firstname + " " + userData.val().lastname,
	                        invitorPhoto: $scope.imageSrc
	                    });
                    } else {
	                    fbCirclePushRef.update({
	                        invitorName: userData.val().firstname + " " + userData.val().lastname,
	                        invitorPhoto: userData.val().profilePhoto
	                    });
                    }
                });

                // Writing circle ID to the user's path and set Status to true
                fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child(groupID).update({
                    Status: true
                });

                // Get the reference for the push
                var fbAcceptedMembers = new Firebase(fbRef + "/Circles/" + $stateParams.circleID + "/AcceptedMembers");
                var fbAcceptedMembersPushRef = new Firebase(fbRef + "/Circles/" + $stateParams.circleID + "/AcceptedMembers").push();
                var fbUser = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid);
                fbUser.once("value", function(userData) {
                    // Store the user information
                    // 'Singular': This group type has an admin
                    // 'Regular': This group doesn't have an admin(may be in the future)
                    if (circleType == 'Singular') {
                        fbAcceptedMembersPushRef.update({
                            admin: true,
                            firstName: userData.val().firstname,
                            lastName: userData.val().lastname,
                            phone: userData.val().phonenumber,
                            email: userData.val().email,
                            profilePhoto: userData.val().profilePhoto
                        });
                    } else {
                        fbAcceptedMembersPushRef.update({
                            admin: false,
                            firstName: userData.val().firstname,
                            lastName: userData.val().lastname,
                            phone: userData.val().phonenumber,
                            email: userData.val().email,
                            profilePhoto: userData.val().profilePhoto
                        });
                    }
                });

                // Writing UserID under CircleID and set Status to true and initialize notification counter badge to 0
                // If the group is singluar set the priority to 0, else don't set
                if (circleType == 'Singular') {
                    fbRef.child("Circles").child(groupID).child("Members").child($rootScope.fbAuthData.uid).update({
                        Status: true,
                        badgeCounter: 0,
                        Priority: 0
                   });
                } else {
                   fbRef.child("Circles").child(groupID).child("Members").child($rootScope.fbAuthData.uid).update({
                        Status: true,
                        badgeCounter: 0
                    });
                }

                // Save the timestamp to trigger the circle-start-scheduler
                var date = Firebase.ServerValue.TIMESTAMP;
                console.log("Firebase.ServerValue.TIMESTAMP @ STARTDATE-test" + date);
                fbRef.child('StartDate-test').push({
                    date: date,
                    circleID: groupID,
                    plan: plan,
                    amount: amount
                });

                // Checking for registered users and generating new Circle invite codes for non-registered users
                for (var i = 0; i < $scope.data.selectedContacts.length; i++) {
                    // This makes sure variable i is available for the callback function
                    (function(i) {
                        // Use the secret key and set the id length to be 4
                        var hashids = new Hashids("SecretMonkey", 4);
                        console.log("HashID: " + hashids);
                        var temp = parseInt($scope.data.selectedContacts[i].phone);
                        console.log("Phones:   " + temp);
                        var id = hashids.encode(temp);
                        console.log("ID after encode: " + id);

                        // Get the link to the Registered User
                        var fbHash = new Firebase(fbRef + "/RegisteredUsers/" + id);
                        console.log("User LINK: " + fbHash);

                        // Callback function to obtain user info
                        fbCallback.fetch(fbHash, function(data) {
                            // Check if invited user is registered with WalletBuddies
                            if (data != null) {
                                console.log("Invited user is registered with uid: " + data.uid);

                                // Writing UserID under CircleID and set Status to pending
                                fbRef.child("Circles").child(groupID).child("Members").child(data.uid).update({
                                    Status: "pending"
                                });

                                // Writing circle ID to the user's path and set Status to pending
                                fbRef.child("Users").child(data.uid).child("Circles").child(groupID).update({
                                    Status: "pending"
                                });

                                // Save to push notifications folder
                                fbCallback.fetch(fbProfile, function(output) {
                                    fbName = output.firstname;
                                    fbRef.child('PushNotifications').push({
                                        uid: data.uid,
                                        message: fbName + " has invited you to form a Circle on WalletBuddies.",
                                        payload: groupID,
                                        tab: "requests"
                                    });
                                });
                            }
                            // Push email invite if user is not registered
                            else {
                                console.log("Invited user is not registered, push email invites.");
                                // Get the link to the Registered User
                                var fbInvites = new Firebase(fbRef + "/Invites/" + id);

                                // Save the CircleId under Invites and Push the invite
                                fbInvites.push({
                                    circleID: groupID,
                                    circleType: circleType
                                });

                                // Save data for sending email notification
                                var email = $scope.data.selectedContacts[i].email;
                                var phone = $scope.data.selectedContacts[i].phone;

                                fbCallback.fetch(fbProfile, function(output) {
                                    fbName = output.firstname;
                                    // Check if user has phonenumber only or email only or both
                                    if (email && phone) {
                                        // Write email info to /Sendgrid folder to trigger the server to send email
                                        fbRef.child('Sendgrid').push({
                                            from: 'hello@walletbuddies.co',
                                            to: email,
                                            subject: "You've been invited to form a Circle on WalletBuddies by " + fbName,
                                            text: fbName + " has invited you to the " + groupName + " Circle on WalletBuddies. Click here: www.walletbuddies.co to download the app and join this Circle. Have fun. :)"
                                        });
                                        console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + email);
                                    } else if (email) {
                                        // Write email info to /Sendgrid folder to trigger the server to send email
                                        fbRef.child('Sendgrid').push({
                                            from: 'hello@walletbuddies.co',
                                            to: email,
                                            subject: "You've been invited to form a Circle on WalletBuddies by " + fbName,
                                            text: fbName + " has invited you to the " + groupName + " Circle on WalletBuddies. Click here: www.walletbuddies.co to download and join this Circle. Have fun. :)"
                                        });
                                        console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + email);
                                    } else {
                                        // Write email info to /Sendgrid folder to trigger the server to send email
                                        fbRef.child('Twilio').push({
                                            to: phone,
                                            text: fbName + " has invited you to the " + groupName + " Circle on WalletBuddies. Click here: www.walletbuddies.co to download and join this Circle. Have fun. :)"
                                        });
                                        console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + phone);
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
                    template: "Your invites are one their way. :)"
                });

                // Get a reference to the NewsFeed of the user
                var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
                var dt = Date.now();
                var feedToPush = "You created a new circle <b>" + groupName + "</b>.";

                // Append new data to this FB link
                fbNewsFeedRef.push({
                    feed: feedToPush,
                    icon: "ion-ios7-chatboxes",
                    color: "orange-icon",
                    time: dt
                });

                // Record entry into Group Controlller
                if(typeof analytics !== 'undefined') {
                    analytics.trackView("Group Controller");
                    analytics.trackEvent('GroupCtrl', 'Pass', 'In GroupCtrl', 104);
                }

                // The data is ready, switch to the Wallet tab
                $state.go('tab.wallet');
            }
        }
    }
})

// Controller for Wallet tab
.controller('WalletCtrl', function($scope, $state, $ionicPopup, $rootScope, fbCallback, $firebaseArray, $http, $firebaseObject, $ionicLoading) {
    // Check if user has linked a bank account before he can start a circle
    $scope.newCircle = function() {
        var fbUser = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid + "/Payments");
        fbUser.once("value", function(data) {
            // Check if user's bank account is linked and KYC verified
            if (data.child("Bank").exists() && data.child("KYC").exists()) {
                // Set the circleTypePicked to "None"
                $rootScope.circleTypePicked = "None";

                // Go to the page to select the type of circle
                $state.go('tab.socialcircle');
            } else {
                $ionicPopup.alert({
                    title: "You haven't linked your bank account yet!",
                    template: "You can start a new circle once you've linked an account. Please go to settings to link an account."
                });
            }
        });
    };

    // Record entry into the Wallet Controller
    if(typeof analytics !== 'undefined') {
        analytics.trackView("Wallet Controller");
        analytics.trackEvent('WalletCtrl', 'Pass', 'In WalletCtrl', 105);
    }

    $scope.id = $rootScope.fbAuthData.uid;
    console.log("IDesh: " + $scope.id);

    // Get a reference to the Firebase account
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

    // Get a reference to where the User's circle IDs are stored
    var fbUserCircle = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/Circles/");

    // Get a reference to where the User's accepted circles are going to be stored
    var fbUserAcceptedCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");

    // Delete all the accepted circles cached data
    // NOTE: This needs to be removed after all our users download the latest
    //       version of the app. Removal of this may show faster loading times.
    fbUserAcceptedCircles.remove();

    // Update $scope.circles
    $scope.circles = $firebaseArray(fbUserAcceptedCircles);

    // Obtain list of circle IDs with a "true" status
    // NOTE: This callback gets called on a 'child_added' event.
    fbCallback.childAdded(fbUserCircle, true, function(data) {
        var fbCircles = new Firebase(fbRef + "/Circles/" + data.key());

        // Obtain circle data for the accepted circles
        fbCallback.fetch(fbCircles, function(output) {
            // Get the information within the circle
            var acceptedCircleVal = output;
            console.log(acceptedCircleVal);

            // Get the reference for the push
            var fbAcceptedCirclePushRef = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/" + data.key());

            // Update the location(temporary cache)
            fbAcceptedCirclePushRef.update(acceptedCircleVal);
        });
    });

    // Obtain list of circle IDs with a "true" status
    // NOTE: This callback gets called on a 'child_removal'	event.
    fbCallback.childRemoved(fbUserCircle, true, function(data) {
        var fbCircles = new Firebase(fbRef + "/Circles/" + data.key());

        // Obtain circle data for the pending circles
        fbCallback.fetch(fbCircles, function(output) {
            var acceptedCircleVal = output;

            // Check for the Pending Circle which went from Pending to Accepted/Rejected
            // and remove the corresponding entry in the "cache"
            fbUserAcceptedCircles.on('child_added', function(snapshot) {
                if (snapshot.val().circleName == acceptedCircleVal.circleName) {
                    var fbAcceptedRemove = new Firebase(fbUserAcceptedCircles + "/" + snapshot.key());
                    console.log("Removal:" + fbAcceptedRemove);
                    fbAcceptedRemove.remove();
                }
            });
        });
    });
})

// Controller for wallet-detail page
.controller('WalletDetailCtrl', function($scope, $stateParams, $firebaseObject, $cordovaCamera, $ionicScrollDelegate, $ionicActionSheet, $ionicLoading, $cordovaContacts, $ionicModal, $rootScope, $state, $ionicPopup, $firebaseArray, fbCallback) {
    // Get a reference to the Firebase account
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
    var fbCircles = new Firebase(fbRef + "/Circles/" + $stateParams.circleID);
    var fbUserAcceptedCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/" + $stateParams.circleID);
    // Get the link to the user profile
    var fbProfile = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid);
    var obj = $firebaseObject(fbCircles);
    $scope.id = $rootScope.fbAuthData.uid;

    obj.$bindTo($scope, "circle");

    // For selecting a profile photo
    $scope.selectPicture = function() {
        // Show the action sheet
        var hideSheet = $ionicActionSheet.show({
            buttons: [{
                text: 'Choose Photo'
            }, {
                text: 'Take Photo'
            }],
            cancelText: 'Cancel',
            cancel: function() {
                // add cancel code..
            },
            buttonClicked: function(index) {
                if (index == 0) {
                    hideSheet();
                    var options = {
                        quality: 75,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 600,
                        targetHeight: 600,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        fbCircles.update({
                            circlePhoto: $scope.imageSrc
                        });
                    }, function(err) {
                        $ionicLoading.show({
                            template: 'No Photo Selected',
                            duration: 1000
                        });
                    });
                }
                if (index == 1) {
                    hideSheet();
                    var options = {
                        quality: 75,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.CAMERA,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 600,
                        targetHeight: 600,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        fbCircles.update({
                            circlePhoto: $scope.imageSrc
                        });
                        fbUserAcceptedCircles.update({
                            circlePhoto: $scope.imageSrc
                        });

                    }, function(err) {
                        $ionicLoading.show({
                            template: 'No Photo Selected',
                            duration: 1000
                        });
                    });
                }
            }
        });
    };

    // Create a link to a CircleMembers under this circle
    var fbCircleAcceptedMembers = new Firebase(fbRef + "/Circles/" + $stateParams.circleID + "/AcceptedMembers");
    var fbCircleAcceptedMembersObj = $firebaseObject(fbCircleAcceptedMembers);

    $ionicLoading.show({
        template: "Loading circle data..."
    });

    // Hide the notification after the data is loaded
    fbCircleAcceptedMembers.once("value", function(snapshot){
        var dataExists = snapshot.exists();

        if(dataExists){
            console.log("Data exists");

            // Update $scope.members
            $scope.members = $firebaseArray(fbCircleAcceptedMembers);

            // Hide the notification
            $ionicLoading.hide();
        }else{
            // Update $scope.members
            $scope.members = $firebaseArray(fbCircleAcceptedMembers);

            // NOTE!! We should never enter here, this is only for making sure
            //        that we have the new UI work with older code on the client.
            //        The newer UI assumes that there is an /AcceptedMembers folder.
            //        Also as of 11/18/2015 when this code was added, the clients
            //        are not aware of a Singular group, so the 'admin' field is
            //        always false. This section needs to be modified/deleted
            //        after we delete the app.
            obj.$loaded().then(function() {
                console.log("loaded record for FBCIRCLE MEMBERS:", obj.$id, obj.Members);

                angular.forEach(obj.Members, function(value, key) {
                    fbRef.child("Users").child(key).once('value', function(userData) {
                        // Get the reference for the push
                        var fbCircleAcceptedMembersPushRef = fbCircleAcceptedMembers.push();

                        fbRef.child("Users").child(key).child("Circles").child($stateParams.circleID).child("Status").once('value', function(acceptStatus){
                            console.log("Accept Status", acceptStatus.val());

                            // Show only users who have accepted the invite
                            if(acceptStatus.val() == true)
                            {
                                // Once the user data is loaded update the information
                                // Update the location(temporary cache)
                                fbCircleAcceptedMembersPushRef.update({
                                    admin: false,
                                    firstName: userData.val().firstname,
                                    lastName: userData.val().lastname,
                                    phone: userData.val().phonenumber,
                                    email: userData.val().email,
                                    profilePhoto: userData.val().profilePhoto
                                });
                            }
                        });
                    });
                });

                // Hide the notification
                $ionicLoading.hide();
            });
        }
    });


    $ionicModal.fromTemplateUrl('display-contact-modal.html', {
        id: '1',
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.contactmodal = modal;
    });
    $scope.openModal = function(selectedMember) {
        $scope.memberToDisplay = selectedMember;
        $scope.contactmodal.show();
    };
    $scope.closeModal = function() {
        $scope.contactmodal.hide();
    };


    // Record entry into Wallet Detail Controlller
    if(typeof analytics !== 'undefined') {
        analytics.trackView("Wallet Detail Controller");
        analytics.trackEvent('WalletDetailCtrl', 'Pass', 'In WalletDetailCtrl', 106);
    }

    $scope.chat = function() {
        $state.go('tab.chat', {
            circleID: $stateParams.circleID
        });
    };
    // For accessing the device's contacts
    $scope.data = {
        selectedContacts: []
    };
    // Adding more buddies for Singular
    $scope.selectContacts = function() {
	    // Show the action sheet
        var hideSheet = $ionicActionSheet.show({
            buttons: [{
                text: 'Add More Buddies To This Circle'
            }],
            cancelText: 'Cancel',
            cancel: function() {
                // add cancel code..
            },
            // For accessing the device's contacts
            buttonClicked: function(index) {
	            hideSheet();
			    // Import all contacts from the address book
			    $ionicLoading.show({
		            template: 'Fetching your contacts...'
		        });
			    var options = {};
				options.multiple = true;
			    $cordovaContacts.find(options).then(function(allContacts) { //omitting parameter to .find() causes all contacts to be returned
			      $scope.contacts = allContacts;
			      $scope.modal.show();
			      $ionicLoading.hide();
			    });
            }
        })
    }

    // Initialize an array to store selected contacts
  	var temp = [];

    $scope.scrollTop = function() {
        $ionicScrollDelegate.resize();
    };

  	$scope.phoneSelect = function(parentObj, Obj) {
	  	var parentIndex = $scope.contacts.indexOf(parentObj);
	  	var index = $scope.contacts[$scope.contacts.indexOf(parentObj)].phoneNumbers.indexOf(Obj);
	  	console.log("PHONE Index: ", parentIndex, index, $scope.contacts[parentIndex].phoneNumbers[index].selected);

	  	// Save the index values received when a user selects a contact
	  	if($scope.contacts[parentIndex].phoneNumbers[index].selected) {
			temp.push({
			  	parent: parentIndex,
			  	child: index
			});
	  	} else if($scope.contacts[parentIndex].phoneNumbers[index].selected == false) {
		  	for (var i = 0; i < temp.length; i++) {
			    if(parentIndex == temp[i].parent && index == temp[i].child) {
				    temp.splice(i, 1);
			    };
		    };
	  	}
  	}
  	// For determining the collection-item-length while choosing contacts
  	$scope.itemheight = function(length) {
	  	if (length == 1) {
		  	return 70;
	  	} else if (length == 2) {
		  	return 140;
	  	} else if (length == 3){
		  	return 210;
	  	} else if (length == 4){
		  	return 280;
	  	} else if (length == 5){
		  	return 350;
	  	} else {
		  	return 420;
	  	}
  	}

  	// Execute action on hide modal
	$scope.$on('modal.hidden', function(modal) {
        if(modal.id == '2'){
    	    // Execute action
    	    console.log("TEMP CONTACTS ARRAY: " + JSON.stringify(temp));
    	    // Initialize an array for storing contacts
    	    $scope.data = {
    	        selectedContacts: []
    	    };
    	    for (var i = 0; i < temp.length; i++) {
    		    if($scope.contacts[temp[i].parent].emails != null) {
    			    $scope.data.selectedContacts.push({
    				    name: $scope.contacts[temp[i].parent].name.formatted,
    				    phone: $scope.contacts[temp[i].parent].phoneNumbers[temp[i].child].value,
    				    phoneType: $scope.contacts[temp[i].parent].phoneNumbers[temp[i].child].type,
    				    email: $scope.contacts[temp[i].parent].emails[0].value,
    				    emailType: $scope.contacts[temp[i].parent].emails[0].type
    			    });
    		    } else {
    				$scope.data.selectedContacts.push({
    				    name: $scope.contacts[temp[i].parent].name.formatted,
    				    phoneType: $scope.contacts[temp[i].parent].phoneNumbers[temp[i].child].type,
    				    phone: $scope.contacts[temp[i].parent].phoneNumbers[temp[i].child].value
    			    });
    		    }
    	    };
    	    console.log("SELECTED CONTACTS: " + JSON.stringify($scope.data.selectedContacts));
    	    $ionicScrollDelegate.scrollBottom(true, true);
        }
	});

  	$ionicModal.fromTemplateUrl('contacts-modal.html', {
        id: '2',
	    scope: $scope,
	    animation: 'slide-in-up'
	}).then(function(modal) {
	    $scope.modal = modal;
	});

    // Deleting contact selected in error
    $scope.contactDelete = function(item) {
   		$scope.data.selectedContacts.splice(item, 1);
   		temp.splice(item, 1);
    };

    // This function is called when the "Invite your wallet buddies" button is pressed
    $scope.addGroup = function() {
        // Use angular.copy to avoid $$hashKey being added to object
        $scope.data.selectedContacts = angular.copy($scope.data.selectedContacts);

        //  Loop for removing symbols in phone numbers
        for (var i = 0; i < $scope.data.selectedContacts.length; i++) {
            var str = $scope.data.selectedContacts[i].phone;
            $scope.data.selectedContacts[i].phone = str.replace(/\D/g, '');
            var temp = $scope.data.selectedContacts[i].phone;
            // Removing 1 from the phone number
            if (temp.length > 10) {
                var temp = temp.substring(1);
                var temp_int = parseInt(temp);
                $scope.data.selectedContacts[i].phone = temp_int;
            }
        }

        // Checking for registered users and generating new Circle invite codes for non-registered users
        for (var i = 0; i < $scope.data.selectedContacts.length; i++) {
            // This makes sure variable i is available for the callback function
            (function(i) {
                // Use the secret key and set the id length to be 4
                var hashids = new Hashids("SecretMonkey", 4);
                console.log("HashID: " + hashids);
                var temp = parseInt($scope.data.selectedContacts[i].phone);
                console.log("Phones:   " + temp);
                var id = hashids.encode(temp);
                console.log("ID after encode: " + id);

                // Get the link to the Registered User
                var fbHash = new Firebase(fbRef + "/RegisteredUsers/" + id);
                console.log("User LINK: " + fbHash);

                // Callback function to obtain user info
                fbCallback.fetch(fbHash, function(data) {
                    // Check if invited user is registered with WalletBuddies
                    if (data != null) {
                        console.log("Invited user is registered with uid: " + data.uid);

                         // Writing UserID under CircleID and set Status to pending
                        fbRef.child("Circles").child(groupID).child("PendingMembers").child(data.uid).update({
                            Status: "pending"
                        });

                        // Writing circle ID to the user's path and set Status to pending
                        fbRef.child("Users").child(data.uid).child("Circles").child(groupID).update({
                            Status: "pending"
                        });

                        // Save to push notifications folder
                        fbCallback.fetch(fbProfile, function(output) {
                            fbName = output.firstname;
                            fbRef.child('PushNotifications').push({
                                uid: data.uid,
                                message: fbName + " has invited you to join a Circle on WalletBuddies.",
                                payload: groupID,
                                tab: "requests"
                            });
                        });
                    }
                    // Push email invite if user is not registered
                    else {
                        console.log("Invited user is not registered, push email invites.");
                        // Get the link to the Registered User
                        var fbInvites = new Firebase(fbRef + "/Invites/" + id);

                        // Save the CircleId under Invites and Push the invite
                        fbInvites.push({
                            circleID: groupID,
                            circleType: 'Singular'
                        });

                        // Save data for sending email notification
                        var email = $scope.data.selectedContacts[i].email;
                        var phone = $scope.data.selectedContacts[i].phone;

                        fbCallback.fetch(fbProfile, function(output) {
                            fbName = output.firstname;
                            // Check if user has phonenumber only or email only or both
                            if (email && phone) {
                                // Write email info to /Sendgrid folder to trigger the server to send email
                                fbRef.child('Sendgrid').push({
                                    from: 'hello@walletbuddies.co',
                                    to: email,
                                    subject: "You've been invited to join a Circle on WalletBuddies by " + fbName,
                                    text: fbName + " has invited you to the " + groupName + " Circle on WalletBuddies. Click here: www.walletbuddies.co to download the app and join this Circle. Have fun. :)"
                                });
                                console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + email);
                            } else if (email) {
                                // Write email info to /Sendgrid folder to trigger the server to send email
                                fbRef.child('Sendgrid').push({
                                    from: 'hello@walletbuddies.co',
                                    to: email,
                                    subject: "You've been invited to join a Circle on WalletBuddies by " + fbName,
                                    text: fbName + " has invited you to the " + groupName + " Circle on WalletBuddies. Click here: www.walletbuddies.co to download and join this Circle. Have fun. :)"
                                });
                                console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + email);
                            } else {
                                // Write email info to /Sendgrid folder to trigger the server to send email
                                fbRef.child('Twilio').push({
                                    to: phone,
                                    text: fbName + " has invited you to the " + groupName + " Circle on WalletBuddies. Click here: www.walletbuddies.co to download and join this Circle. Have fun. :)"
                                });
                                console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + phone);
                            }
                        });
                    }
                });
            })(i);
        }

        $ionicPopup.alert({
            title: "Whooosh!",
            template: "Your invites are one their way. :)"
        });

        //Reset the contacts array
		$scope.data.selectedContacts = [];
    }

    //Cancel a group - set the flag to true
    $scope.cancelCircle = function () {
        console.log("fbCircles"+ fbCircles);
        fbCircles.update({
            circleCancelled: true
        });
    }
    // Creating a reference to the priority field
	var fbCircleMemberPath = new Firebase(fbRef + "/Circles/" + $stateParams.circleID + "/Members/" + $rootScope.fbAuthData.uid);
	var members = $firebaseObject(fbCircleMemberPath);
	members.$bindTo($scope, "Member");
	
	// Display credit and debit dates
	var fbCredits = new Firebase(fbRef + "/Circles/" + $stateParams.circleID + "/NotificationDates-test/");
	$scope.credit = $firebaseObject((fbCredits).limitToLast(1));
	var fbDebits = new Firebase(fbRef + "/Circles/" + $stateParams.circleID + "/DebitDates-test/");
	$scope.debit = $firebaseObject((fbDebits).limitToLast(1));
})

// Controller for chat
.controller('ChatCtrl', function($scope, $stateParams, $state, $rootScope, $ionicNavBarDelegate, $timeout, $ionicScrollDelegate, $firebaseArray, $firebaseObject, UpdateMessages) {
    var fbMessages = new Firebase("https://walletbuddies.firebaseio.com/Circles/" + $stateParams.circleID + "/Messages/");
    var fbQuery = fbMessages.limitToLast(50);
    // Create a synchronized array at the firebase reference
    $scope.messages = $firebaseArray(fbMessages);
    
    // This scope var controls the focus of the keyboard
    $scope.isFocused = "false";
	$scope.contentClick = function () { // triggered by an ngClick placed in <ion-content>
	    $scope.isFocused = "false";
	}
	$scope.inputClick = function () { // triggered by an ngClick placed in the <textarea>
		$scope.isFocused = "true";
	}

	
	$scope.onBlur = function() {
        if ($scope.isFocused == "true") {
            $('#message').focus();
        }
    };

	$scope.$on('$ionicView.enter', function() {
        // Record entry into Chat Controlller
        if(typeof analytics !== 'undefined') {
            analytics.trackView("Chat Controller");
            analytics.trackEvent('ChatCtrl', 'Pass', 'In ChatCtrl', 107);
        }

	    $ionicNavBarDelegate.showBackButton(true);
	    // Scroll down the content automatically
        $ionicScrollDelegate.scrollBottom(true, true);
        //cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        // Updating chat badge counter
		var ref = new Firebase("https://walletbuddies.firebaseio.com");
		// Get a reference to where the User's accepted circles are going to be stored
		var fbUserAcceptedCircles = new Firebase(ref + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/" + $stateParams.circleID + "/Members/" + $rootScope.fbAuthData.uid);
		fbUserAcceptedCircles.once("value", function(data){
			ref.child('Users').child($rootScope.fbAuthData.uid).once("value", function(userData){
				// Get the existing total notification count
				var walletCounter = userData.val().Badges.walletCounter;
                var badgeCounter = data.val().badgeCounter;

                console.log("walletCounter: " + walletCounter);
                console.log("badgeCounter: " + badgeCounter);

                // If badgeCounter is greater than 0(for this circle),
                // that means the messages haven't been read yet,
                // so decrement walletCounter if it is not 0 already for
                // some UNKNOWN reason
                if(badgeCounter > 0){
                    walletCounter = walletCounter - userData.val().badgeCounter;
                }

                // Update the total badges counter
                ref.child('Users').child($rootScope.fbAuthData.uid).child('Badges').update({
	                walletCounter: walletCounter
				});

                // Set badgeCounter to 0 only if it not-zero
                // (otherwise junk data will be displayed in the wallet tab)
                if(badgeCounter != 0){
                    // Set badgeCounter to 0
    				fbUserAcceptedCircles.child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
    					badgeCounter: 0
    				});

    				ref.child("Circles").child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
    					badgeCounter: 0
    				});
                }
			})
		});
	});

	// Updating chat badge counter
	$scope.$on('$ionicView.leave', function() {
		var ref = new Firebase("https://walletbuddies.firebaseio.com");
		// Get a reference to where the User's accepted circles are going to be stored
		var fbUserAcceptedCircles = new Firebase(ref + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");
		fbUserAcceptedCircles.child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).once("value", function(data){
			ref.child('Users').child($rootScope.fbAuthData.uid).once("value", function(userData){
				//Decrement this circle's chat counter from totalCount
				var walletCounter = userData.val().Badges.walletCounter - data.val().badgeCounter;
				if (walletCounter >= 0) {
					ref.child('Users').child($rootScope.fbAuthData.uid).child('Badges').update({
						walletCounter: walletCounter
					});
				} else {
					ref.child('Users').child($rootScope.fbAuthData.uid).child('Badges').update({
						walletCounter: 0
					});
				}
				// Set badgeCounter to 0
				fbUserAcceptedCircles.child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
					badgeCounter: 0
				})
				ref.child("Circles").child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
					badgeCounter: 0
				})
			})
		});
	});

	$scope.goBack = function() {
		$state.go('tab.wallet');
	}

	$scope.text = function() {
		$ionicScrollDelegate.scrollBottom(true, true);
	};

    // Save the uid to use in the view
    $scope.uid = $rootScope.fbAuthData.uid;

    $scope.hideTime = true;

    var alternate;
    var isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();

    $scope.sendMessage = function() {
	    console.log("SENDING MESSAGE", $scope.data.message);
	    var message = $scope.data.message;
	    delete $scope.data.message;
        alternate = !alternate;
		
        // Create a firebase reference to get the user's information
        var fbRef = new Firebase("https://walletbuddies.firebaseio.com");
        var profile = $firebaseObject(fbRef.child("Users").child($rootScope.fbAuthData.uid));       
		
		//UpdateMessages.update($scope.data.message, $stateParams.circleID);
		var fbRef = new Firebase("https://walletbuddies.firebaseio.com");
	    var fbMessages = new Firebase("https://walletbuddies.firebaseio.com/Circles/" + $stateParams.circleID + "/Messages/");
	    var d = Date.now();
	    fbRef.child("Users").child($rootScope.fbAuthData.uid).once('value', function(userData) {
	        console.log("$scope.data.message: " + message, $rootScope.fbAuthData.uid, d, userData.val().firstname);
	        fbMessages.push({
	            userId: $rootScope.fbAuthData.uid,
	            text: message,
	            time: d,
	            name: userData.val().firstname,
	            photo: userData.val().profilePhoto
	        });
	    });	
		
        fbMembers = new Firebase("https://walletbuddies.firebaseio.com/Circles/").child($stateParams.circleID);
        fbPush = new Firebase("https://walletbuddies.firebaseio.com/");
        var obj = $firebaseObject(fbMembers);
        obj.$loaded().then(function() {
            // To iterate the key/value pairs of the object, use angular.forEach()
            angular.forEach(obj.Members, function(value, key) {
                console.log("key and value pair: " + value + key);
                if ($rootScope.fbAuthData.uid == key) {
                    //do nothing
                } else {
                    fbPush.child('Users').child($rootScope.fbAuthData.uid).once('value', function(name) {
                        fbPush.child('PushNotifications').push({
                            uid: key,
                            message: name.val().firstname + ' @ ' + obj.circleName + ': ' + $scope.data.message,
                            payload: $stateParams.circleID,
                            tab: "chat"
                        });
                    });
                }
            });
        })
    };

    // Scroll down when new messages are added
    fbMessages.on('child_added', function(data) {
        $timeout(function() {
            $ionicScrollDelegate.scrollBottom(false, true);
        }, 300);
    });

    $scope.inputUp = function() {
        if (isIOS) $scope.data.keyboardHeight = 216;
        $timeout(function() {
            cordova.plugins.Keyboard.disableScroll(true);
        }, 300);
    };

    $scope.inputDown = function() {
        if (isIOS) $scope.data.keyboardHeight = 0;
        $ionicScrollDelegate.resize();
    };

    $scope.$on('$ionicView.leave', function() {
        //cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
    });
})

// Controller for requests tab
.controller('RequestsCtrl', function($scope, $firebaseArray, $firebaseObject, $rootScope, fbCallback) {
    // Get a reference to the Firebase account
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

    // Get a reference to where the User's circle IDs are stored
    var fbUserCircle = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/Circles/");

    // Get a reference to where the User's pending circles are going to be stored
    var fbUserPendingCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/PendingCircles/");

    // Clear all the data
    fbUserPendingCircles.remove();

	$scope.$on('$ionicView.enter', function() {
		fbRef.child('Users').child($rootScope.fbAuthData.uid).child('Badges').update({
			requestCounter: 0
		});
	});

    // Update $scope.circles
    $scope.circles = $firebaseArray(fbUserPendingCircles);

    // Record entry into Requests Controlller
    if(typeof analytics !== 'undefined') {
        analytics.trackView("Requests Controller");
        analytics.trackEvent('RequestsCtrl', 'Pass', 'In RequestsCtrl', 108);
    }

    // Obtain list of circle IDs with a "pending" status
    // NOTE: This callback gets called on a 'child_removal'	event.
    fbCallback.childAdded(fbUserCircle, "pending", function(data) {
        console.log("Circles Id(pending added): " + data.val().Status + data.key());
        var fbCircles = new Firebase(fbRef + "/Circles/" + data.key());
        console.log("Circles FBCircles(pending added): " + fbCircles);

        // Obtain circle data for the pending circles
        fbCallback.fetch(fbCircles, function(output) {
            var pendingCircleVal = output;

            // Get the reference for the push
            var fbPendingCirclePushRef = fbUserPendingCircles.push();

            // Update the location(temporary cache)
            fbPendingCirclePushRef.update(pendingCircleVal);
        });
    });

    // Obtain list of circle IDs with a "pending" status
    // NOTE: This callback gets called on a 'child_removal'	event.
    fbCallback.childRemoved(fbUserCircle, "pending", function(data) {
        console.log("Circles Id(pending removal): " + data.val().Status + data.key());
        var fbCircles = new Firebase(fbRef + "/Circles/" + data.key());
        console.log("Circles FBCircles(pending removal): " + fbCircles);

        // Obtain circle data for the pending circles
        fbCallback.fetch(fbCircles, function(output) {
            var pendingCircleVal = output;

            // Check for the Pending Circle which went from Pending to Accepted/Rejected
            // and remove the corresponding entry in the "cache"
            fbUserPendingCircles.on('child_added', function(snapshot) {
                if (snapshot.val().circleName == pendingCircleVal.circleName) {
                    var fbPendingRemove = new Firebase(fbUserPendingCircles + "/" + snapshot.key());
                    console.log("Removal:" + fbPendingRemove);
                    fbPendingRemove.remove();
                }
            });
        });
    });
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
                // Send out a push and inform users of accepted invite
                var fbCircle = new Firebase("https://walletbuddies.firebaseio.com/Circles/");
                var fbPush = new Firebase("https://walletbuddies.firebaseio.com/PushNotifications/");
                fbCircle.child($stateParams.circleID).once('value', function(circle) {
					if (circle.val().circleType == 'Singular') {
						// Change Status of the circle to "true" and initializing notification badge to 0
		                fbRef.child("Circles").child($stateParams.circleID).child("PendingMembers").child($rootScope.fbAuthData.uid).update({
		                    Status: true,
		                    badgeCounter: 0
		                });

		                fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child($stateParams.circleID).update({
		                    Status: true
		                });
					} else {
						// Change Status of the circle to "true" and initializing notification badge to 0
		                fbRef.child("Circles").child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
		                    Status: true,
		                    badgeCounter: 0
		                });

		                fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child($stateParams.circleID).update({
		                    Status: true
		                });
					}
                    var d = Date.now();
					//d = d.toLocaleTimeString().replace(/:\d+ /, ' ');
                	fbCircle.child($stateParams.circleID).child('Messages').push({
                    	name: "WalletBuddies",
                    	time: d,
                    	text: data.val().firstname + " has accepted the invite to the " + circle.val().circleName + " circle."
            		});

            		for(var uid in circle.val().Members) {
                        if (circle.val().Members.hasOwnProperty(uid)) {
                            fbPush.push({
			                    uid: uid,
								message: "WalletBuddies" + ' @ ' + circle.val().circleName + ': ' + data.val().firstname + " has accepted the invite to the " + circle.val().circleName + " circle.",
								payload: $stateParams.circleID,
								tab: "chat"
		                	});
                        }
                	}
                });
                // Get a reference to the NewsFeed of the user
		        var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
		        var dt = Date.now();
		        var feedToPush = "You accepted an invite to the circle <b>" + $scope.circle.circleName + "</b>.";

		        // Append new data to this FB link
		        fbNewsFeedRef.push({
		            feed: feedToPush,
		            icon: "ion-ios7-heart",
		            color: "melon-icon",
		            time: dt
		        });

                // Get the reference for the push and store the relevant user information
                var fbAcceptedMembers = new Firebase(fbRef + "/Circles/" + $stateParams.circleID + "/AcceptedMembers");
                var fbAcceptedMembersPushRef = new Firebase(fbRef + "/Circles/" + $stateParams.circleID + "/AcceptedMembers").push();
                var fbUser = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid);
                fbUser.once("value", function(userData) {

                    // Store the user information
                    // NOTE: By default when a user accepts an invite the user is
                    //       not an admin
                    fbAcceptedMembersPushRef.update({
                        admin: false,
                        firstName: userData.val().firstname,
                        lastName: userData.val().lastname,
                        phone: userData.val().phonenumber,
                        email: userData.val().email,
                        profilePhoto: userData.val().profilePhoto
                    });

                    $state.go('tab.requests');
                });
            } else {
                $ionicPopup.alert({
                    title: "You haven't linked your bank account yet!",
                    template: "You can accept a request once you've linked an account. Please go to settings to link an account."
                });
            }
        });
    }

    // Called when user clicks "Decline"
    $scope.onDecline = function() {
        // Send email notification to circle creator & user confirming decline (Currently only sending to the user)
        fbRef.child("Circles").child($stateParams.circleID).once('value', function(data) {
	        if (data.val().circleType == 'Singular') {
				// Change Status of the circle to "false"
                fbRef.child("Circles").child($stateParams.circleID).child("PendingMembers").child($rootScope.fbAuthData.uid).update({
                    Status: false
                });

                // Remove the circle from the User's circle path
				fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child($stateParams.circleID).remove();
			} else {
				// Change Status of the circle to "false"
		        fbRef.child("Circles").child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
		            Status: false
		        });

                // Remove the circle from the User's circle path
				fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child($stateParams.circleID).remove();
			}
            fbRef.child('Sendgrid').push({
                from: 'hello@walletbuddies.co',
                to: $rootScope.fbAuthData.password.email,
                subject: "Confirmation from WalletBuddies",
                text: "This message is to confirm that you have declined to join the Circle " + data.val().circleName + ". \n\n- WalletBuddies"
            });
        });

        // Send out a push and inform users of declined invite
        var fbCircle = new Firebase("https://walletbuddies.firebaseio.com/Circles/");
        var fbPush = new Firebase("https://walletbuddies.firebaseio.com/PushNotifications/");
        fbCircle.child($stateParams.circleID).once('value', function(circle) {

            var d = Date.now();
			//d = d.toLocaleTimeString().replace(/:\d+ /, ' ');
        	fbCircle.child($stateParams.circleID).child('Messages').push({
            	name: "WalletBuddies",
            	time: d,
            	text: data.val().firstname + " has declined the invite to the " + circle.val().circleName + " circle."
    		});

    		for(var uid in circle.val().Members) {
                if (circle.val().Members.hasOwnProperty(uid)) {
                    fbPush.push({
	                    uid: uid,
						message: "WalletBuddies" + ' @ ' + circle.val().circleName + ': ' + data.val().firstname + " has declined the invite to the " + circle.val().circleName + " circle.",
						payload: $stateParams.circleID,
						tab: "chat"
                	});
                }
        	}
        });

        // Get a reference to the NewsFeed of the user
        var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
        var dt = Date.now();
        var feedToPush = "You declined an invite to the circle <b>" + $scope.circle.circleName + "</b>.";

        // Append new data to this FB link
        fbNewsFeedRef.push({
            feed: feedToPush,
            icon: "ion-heart-broken",
            color: "melon-icon",
            time: dt
        });

        // Record entry into Request Detail Controlller
        if(typeof analytics !== 'undefined') {
            analytics.trackView("Request Detail Controller");
            analytics.trackEvent('RequestsDetailCtrl', 'Pass', 'In RequestsDetailCtrl', 109);
        }

        $state.go('tab.requests');
    }
})

// Controller for tab-settings
.controller('SettingsCtrl', function($scope, $firebaseObject, $ionicHistory, $ionicActionSheet, $cordovaCamera, $ionicNavBarDelegate, $state, $rootScope, $stateParams, $ionicLoading, $ionicPopup) {
    // Create a firebase reference
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com");

    var profile = $firebaseObject(fbRef.child("Users").child($rootScope.fbAuthData.uid));

    profile.$bindTo($scope, "data");

    // Record entry into Settings Controlller
    if(typeof analytics !== 'undefined') {
        analytics.trackView("Settings Controller");
        analytics.trackEvent('SettingsCtrl', 'Pass', 'In SettingsCtrl', 110);
    }

    // For selecting a profile photo
    $scope.selectPicture = function() {
        // Show the action sheet
        var hideSheet = $ionicActionSheet.show({
            buttons: [{
                text: 'Choose Photo'
            }, {
                text: 'Take Photo'
            }],
            cancelText: 'Cancel',
            cancel: function() {
                // add cancel code..
            },
            buttonClicked: function(index) {
                if (index == 0) {
                    hideSheet();
                    var options = {
                        quality: 75,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 600,
                        targetHeight: 600,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        fbRef.child("Users").child($rootScope.fbAuthData.uid).update({
                            profilePhoto: $scope.imageSrc
                        });
                    }, function(err) {
                        $ionicLoading.show({
                            template: 'No Photo Selected',
                            duration: 1000
                        });
                    });
                }
                if (index == 1) {
                    hideSheet();
                    var options = {
                        quality: 75,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.CAMERA,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 600,
                        targetHeight: 600,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        fbRef.child("Users").child($rootScope.fbAuthData.uid).update({
                            profilePhoto: $scope.imageSrc
                        });
                    }, function(err) {
                        $ionicLoading.show({
                            template: 'No Photo Selected',
                            duration: 1000
                        });
                    });
                }
            }
        });
    };

    // Go to tab-account
    $scope.account = function() {
        $state.go("tab.account");
    };

    // Called when the user clicks the "Reset Password" button
    $scope.newPassword = function() {
        // Go to the forgot password page
        $state.go('tab.resetpassword');
    }

    // Signout from the app
    $scope.signOut = function() {
        $ionicLoading.show({
            template: 'Signing out..See ya!',
            duration: 1000
        });
        // Get a reference to where the User's pending circles are going to be stored
        var fbUserPendingCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/PendingCircles/");

        // Delete all the pending circles cached data
        fbUserPendingCircles.remove();

        // Get a reference to where the User's accepted circles are going to be stored
        var fbUserAcceptedCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/");

        // Delete all the accepted circles cached data
        fbUserAcceptedCircles.remove();

        $ionicHistory.clearCache();
        $ionicHistory.clearHistory();
        fbRef.unauth();
        $state.go('launch');
    };

    // Called when the user clicks the "Survey" button
    $scope.survey = function() {
        fbRef.child("Users").child($rootScope.fbAuthData.uid).once('value', function(userData) {
            // If the user hasn't answered the survey page, take them to the survey page
            if (userData.val().survey === false) {
                // Go to the survey page
                $state.go('tab.surveypage');
            } else {
                $ionicPopup.alert({
                    title: "Thanks!",
                    template: "You have already completed our survey :)"
                });
            }
        });
    }
})

// Controller for Reset Password
.controller('SurveyPageCtrl', function($scope, $state, $rootScope, fbCallback, $ionicPopup) {
    // Create a firebase reference
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com");

    // Record entry into Survey Page Controlller
    if(typeof analytics !== 'undefined') {
        analytics.trackView("Survey Page Controlller");
        analytics.trackEvent('SurveyPageCtrl', 'Pass', 'In SurveyPageCtrl', 111);
    }

    $scope.questionList = [{
        text: "How big was your Savings Circle?",
        value: "Question1"
    }, {
        text: "Which plan did you select for the Social Circle?",
        value: "Question2"
    }, {
        text: "What was the amount selected for the Social Circle?",
        value: "Question3"
    }, {
        text: "What did you spend the money on after you got your share?",
        value: "Question4"
    }, {
        text: "If you had an option on our app to spend the money you got paid from your circle? Would you be willing to use it? Similar to the credit card cashback redeem option. ",
        value: "Question5"
    }, ]

    $scope.answer1List = [{
        text: "1-3",
        value: "1-3"
    }, {
        text: "4-6",
        value: "4-6"
    }, {
        text: "7-10",
        value: "7-10"
    }, {
        text: "11-15",
        value: "11-15"
    }, {
        text: "15 or more",
        value: "15 or more"
    }];

    $scope.answer2List = [{
        text: "Daily",
        value: "Daily"
    }, {
        text: "Weekly",
        value: "Weekly"
    }, {
        text: "Biweekly",
        value: "Biweekly"
    }, {
        text: "Monthly",
        value: "Monthly"
    }];

    $scope.answer3List = [{
        text: "1-10",
        value: "1-10"
    }, {
        text: "11-19",
        value: "11-19"
    }, {
        text: "20-29",
        value: "20-29"
    }, {
        text: "30-59",
        value: "30-59"
    }, {
        text: "60-99",
        value: "60-99"
    }, {
        text: "100 or more",
        value: "100 or more"
    }];

    $scope.answer4List = [{
        text: "Savings",
        value: "Savings"
    }, {
        text: "Online Shopping",
        value: "Online Shopping"
    }, {
        text: "Travel",
        value: "Travel"
    }, {
        text: "Food",
        value: "Food"
    }, {
        text: "Investments",
        value: "Investments"
    }, {
        text: "Gift Cards",
        value: "Gift Cards"
    }, {
        text: "Other",
        value: "Other"
    }];

    $scope.answer5List = [{
        text: "Yes",
        value: "Yes"
    }, {
        text: "No",
        value: "No"
    }, {
        text: "May be",
        value: "May be"
    }];

    $scope.question1 = {
        answer: 'ng'
    };

    $scope.question2 = $scope.question3 = $scope.question4 = $scope.question5;

    $scope.questionChosen1 = function(item) {
        $scope.question1 = {
            answer: item.value
        };
        console.log("Answer(1) to be stored:", $scope.question1.answer);
    }

    $scope.questionChosen2 = function(item) {
        $scope.question2 = {
            answer: item.value
        };
        console.log("Answer(2) to be stored:", $scope.question2.answer);
    }

    $scope.questionChosen3 = function(item) {
        $scope.question3 = {
            answer: item.value
        };
        console.log("Answer(3) to be stored:", $scope.question3.answer);
    }

    $scope.questionChosen4 = function(item) {
        $scope.question4 = {
            answer: item.value
        };
        console.log("Answer(4) to be stored:", $scope.question4.answer);
    }

    $scope.questionChosen5 = function(item) {
        $scope.question5 = {
            answer: item.value
        };
        console.log("Answer(5) to be stored:", $scope.question5.answer);
    }

    $scope.submitSurvey = function() {
        // Get the Firebase link for this user
        var fbUser = fbRef.child("Users").child($rootScope.fbAuthData.uid);

        // Store the user information
        fbUser.update({
            survey: true
        });

        var fbUserSurveyResults = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/SurveyResults/");

        // Store the survey information
        fbUserSurveyResults.update({
            question1: $scope.question1.answer,
            question2: $scope.question2.answer,
            question3: $scope.question3.answer,
            question4: $scope.question4.answer,
            question5: $scope.question5.answer
        });

        $state.go("tab.settings");
    }
})

// Controller for tabs
.controller('TabsCtrl', function($scope, $rootScope, $firebaseObject, $state) {

    setTimeout(function () {
        // Updating walletTab badge counter
		var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
		// Get a reference to where the User's accepted circles are going to be stored
		var fbUser = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid);
		$scope.counter = $firebaseObject(fbUser);
    }, 1000);

    // Define all the views that do not need the tab bar at the bottom
    $scope.shouldHide = function() {
        switch ($state.current.name) {
            case 'tab.chat':
                return true;
            case 'statename2':
                return true;
            default:
                return false;
        };
    };

})

// Controller for tab-account
.controller('ConnectCtrl', function($scope, $state, $stateParams, $rootScope, $cipherFactory, $cordovaDevice, $firebaseArray, $cipherFactory, $http, $ionicLoading, $ionicPopup, $ionicHistory, $ionicNavBarDelegate) {
    $scope.user = {
        type: '',
        username: '',
        password: ''
    };

    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid);
    var fbUser = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid + "/Payments");
    var ref = new Firebase("https://walletbuddies.firebaseio.com");

    // List of supported institutions
    $scope.institutions = {
        "banks": [{
            "bank_name": "Ally",
            "date": "2015-06-04T22:50:10.628919",
            "id": "ally",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/ally.png",
            "resource_uri": "/api/v2/bankstatus/11/",
            "status": "Active"
        }, {
            "bank_name": "First Tennessee",
            "date": "2015-06-04T22:50:11.579320",
            "id": "firsttennessee",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/first_tn.png",
            "resource_uri": "/api/v2/bankstatus/12/",
            "status": "Active"
        }, {
            "bank_name": "TD Bank",
            "date": "2015-06-04T22:50:14.312727",
            "id": "td",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/td.png",
            "resource_uri": "/api/v2/bankstatus/13/",
            "status": "Active"
        }, {
            "bank_name": "BB&T Bank",
            "date": "2015-06-04T22:50:14.316785",
            "id": "bbt",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/bbt.png",
            "resource_uri": "/api/v2/bankstatus/16/",
            "status": "Active"
        }, {
            "bank_name": "Bank of America",
            "date": "2015-06-04T22:50:00.069431",
            "id": "bofa",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/bofa.png",
            "resource_uri": "/api/v2/bankstatus/1/",
            "status": "Active"
        }, {
            "bank_name": "Chase",
            "date": "2015-06-04T22:50:00.073254",
            "id": "chase",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/chase.png",
            "resource_uri": "/api/v2/bankstatus/2/",
            "status": "Active"
        }, {
            "bank_name": "Wells Fargo",
            "date": "2015-06-04T22:50:00.076002",
            "id": "wells",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/wells_fargo.png",
            "resource_uri": "/api/v2/bankstatus/3/",
            "status": "Active"
        }, {
            "bank_name": "Citibank",
            "date": "2015-06-04T22:50:00.078971",
            "id": "citi",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/citi.png",
            "resource_uri": "/api/v2/bankstatus/4/",
            "status": "Active"
        }, {
            "bank_name": "US Bank",
            "date": "2015-06-04T22:50:00.081610",
            "id": "us",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/usbank.png",
            "resource_uri": "/api/v2/bankstatus/5/",
            "status": "Active"
        }, {
            "bank_name": "USAA",
            "date": "2015-06-04T22:50:00.084672",
            "id": "usaa",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/usaa.png",
            "resource_uri": "/api/v2/bankstatus/6/",
            "status": "Active"
        }, {
            "bank_name": "Charles Schwab",
            "date": "2015-06-04T22:50:00.087398",
            "id": "schwab",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/charles_schwab.png",
            "resource_uri": "/api/v2/bankstatus/7/",
            "status": "Active"
        }, {
            "bank_name": "Capital One 360",
            "date": "2015-06-04T22:50:00.090046",
            "id": "capone360",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/cap360.png",
            "resource_uri": "/api/v2/bankstatus/8/",
            "status": "Active"
        }, {
            "bank_name": "PNC",
            "date": "2015-06-04T22:50:00.092713",
            "id": "pnc",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/pnc.png",
            "resource_uri": "/api/v2/bankstatus/14/",
            "status": "Active"
        }, {
            "bank_name": "Fidelity",
            "date": "2015-06-04T22:50:00.095358",
            "id": "fidelity",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/fidelity.png",
            "resource_uri": "/api/v2/bankstatus/15/",
            "status": "Active"
        }, {
            "bank_name": "Regions",
            "date": "2015-06-04T22:50:04.796854",
            "id": "regions",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/regionsbank.png",
            "resource_uri": "/api/v2/bankstatus/9/",
            "status": "Active"
        }, {
            "bank_name": "SunTrust",
            "date": "2015-06-04T22:50:10.625099",
            "id": "suntrust",
            "logo": "https://s3.amazonaws.com/synapse_django/bank_logos/suntrust.png",
            "resource_uri": "/api/v2/bankstatus/10/",
            "status": "Active"
        }]
    }
    
    // Go to manual account setup
    $scope.account = function() {
        $state.go("tab.manual-account");
    };

    $scope.connect = function(user) {
        $ionicLoading.show({
            template: 'Loading..Hold tight.'
        });
        fbRef.once('value', function(userData) {
	        ref.child('SynapsePay').once('value', function(data) {
	        	// Check if SynapsePay account exists
		        if (!userData.child("Payments").exists()) {
					// Create a SynapsePay user account
					// get host ip address of client
					var json = 'http://ipv4.myexternalip.com/json';
					$http.get(json).then(function(result) {
						var ip = result.data.ip;
						var uuid = $cordovaDevice.getUUID();
						console.log("uuid: " + uuid);
						console.log("IP ADDRESS: " + ip);
		                $http.post('https://synapsepay.com/api/v3/user/create', {
		                    "client": {
		                        //your client ID and secret
		                        "client_id": data.val().client_id,
		                        "client_secret": data.val().client_secret
		                    },
		                    "logins": [
		                        //email and password of the user. Passwords are optional.
		                        //yes you can add multiple emails and multiple users for one account here
		                        {
		                            "email": userData.val().email,
		                            "read_only": false
		                        }
		                    ],
		                    "phone_numbers": [
		                        //user's mobile numbers. Can be used for 2FA
		                        userData.val().phonenumber
		                    ],
		                    "legal_names": [
		                        //user's legal names. If multiple user's are being added, add multiple legal names.
		                        //If business account, add the name of the person creating the account and the name of the company
		                        userData.val().firstname + " " + userData.val().lastname
		                    ],
		                    "fingerprints": [
		                        //fingerprints of the devices that you will be accessing this account from
		                        {
		                            "fingerprint": uuid
		                        }
		                    ],
		                    "ips": [
		                        //user's IP addresses
		                        ip
		                    ],
		                    "extra": {
		                        //optional fields
		                        "note": "WalletBuddies User",
		                        "supp_id": "No IDs Here",
		                        //toggle to true if its a business account
		                        "is_business": false
		                    }
		                }).then(function(response) {
		                    console.log("SYNAPSEPAY response " + JSON.stringify(response));
		                    // Save the returned oauth and refresh tokens
		                    fbRef.child("Payments/oauth").update({
		                        oauth_key: $cipherFactory.encrypt(response.data.oauth.oauth_key, $rootScope.fbAuthData.uid), // We need this for making bank transactions, every user has a unique key.
		                        refresh_token: $cipherFactory.encrypt(response.data.oauth.refresh_token, $rootScope.fbAuthData.uid),
		                        expires_at: response.data.oauth.expires_at,
		                        expires_in: response.data.oauth.expires_in,
		                        client_id: response.data.user.client.id,
		                        fingerprint: uuid,
		                        ip: ip,
		                        oid: response.data.user._id.$oid
		                    });
		                }).catch(function(err) {
		                    if(typeof analytics !== 'undefined') {
		                        analytics.trackEvent('SynapsePay ConnectCtrl', err.statusText, err.data.error.en, 1);
		                    }
		                    console.log("An error occured while communicating with Synapse");
		                    console.log(JSON.stringify(err));
		                });
		            }, function(e) {
		                if(typeof analytics !== 'undefined') {
		                    analytics.trackEvent('IP Address', 'Error Validating', 'In AccountCtrl', e);
		                }
						alert("An error occured while validating your ip address");
					});
		        } else {
			        //Sign in to the user's Synapse Account to refresh the authToken
			        var refresh_token = $cipherFactory.decrypt(userData.val().Payments.oauth.refresh_token.cipher_text, $rootScope.fbAuthData.uid, userData.val().Payments.oauth.refresh_token.salt, userData.val().Payments.oauth.refresh_token.iv);
			        console.log("Signin REFRESH TOKEN: " + refresh_token);
			        $http.post('https://synapsepay.com/api/v3/user/signin', {
		                "client": {
						    //your client ID and secret
						    "client_id": data.val().client_id,
						    "client_secret": data.val().client_secret
						},
						  "login":{
						    //Instead of email and password, you can specify refresh_token of the user as well.
						    "refresh_token": refresh_token
						},
						  "user":{
						    //the id of the user profile that you wish to sign into.
						    "_id":{
						      "$oid": userData.val().Payments.oauth.oid
						},
						    "fingerprint": userData.val().Payments.oauth.fingerprint,
						    "ip": userData.val().Payments.oauth.ip
						}
		            }).then(function(response) {
	                    console.log("SYNAPSEPAY SIGNIN response " + JSON.stringify(response));
	                    // Save the oauth and refresh tokens
	                    fbRef.child("Payments/oauth").update({
	                        oauth_key: $cipherFactory.encrypt(response.data.oauth.oauth_key, $rootScope.fbAuthData.uid), // We need this for making bank transactions, every user has a unique key.
	                        refresh_token: $cipherFactory.encrypt(response.data.oauth.refresh_token, $rootScope.fbAuthData.uid),
	                        expires_at: response.data.oauth.expires_at,
	                        expires_in: response.data.oauth.expires_in
	                    });
						// Connect to the user's bank
						//Decipher oauth keys before POST
			            var oauth_key = $cipherFactory.decrypt(userData.val().Payments.oauth.oauth_key.cipher_text, $rootScope.fbAuthData.uid, userData.val().Payments.oauth.oauth_key.salt, userData.val().Payments.oauth.oauth_key.iv);
			            console.log("oauth_key " + oauth_key);
			            // $http post for Bank Login
			            $http.post('https://synapsepay.com/api/v3/node/add', {
			                'login': {
			                    'oauth_key': response.data.oauth.oauth_key
			                },
			                'user': {
			                    'fingerprint': userData.val().Payments.oauth.fingerprint
			                },
			                'node': {
			                    'type': 'ACH-US',
			                    'info': {
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
			                if (payload.data.success) {
			                    if (payload.data.nodes[0].allowed == null) {
			                        $rootScope.question = payload.data;
			                        $ionicLoading.hide();
			                        $state.go('tab.auth-question');
			                    } else {
			                        $rootScope.data = payload.data;
			                        $ionicLoading.hide();
			                        $state.go('tab.choose-account');
			                    }
			                }
			            }).catch(function(err) {
			                $ionicLoading.hide();
			                if(typeof analytics !== 'undefined') {
			                    analytics.trackEvent('Bank Login ConnectCtrl', err.statusText, err.data.error.en, 1);
			                }
			                console.log("Got an error in bank login.");
			                console.log(JSON.stringify(err));
			                if (err.statusText == 'CONFLICT') {
				                $ionicPopup.alert({
					                title: "Incorrect Credentials",
					                template: "Either your Online ID or password is incorrect!"
					            });
			                }
			                if (err.statusText == 'BAD REQUEST') {
				                $ionicPopup.alert({
					                title: "Select your Bank",
					                template: "Please make sure you've selected your bank from the drop down!"
					            });
			                }
			                //alert(err.statusText);
			            });
	                }).catch(function(err) {
		                $ionicLoading.hide();
	                    if(typeof analytics !== 'undefined') {
	                        analytics.trackEvent('SynapsePay ConnectCtrl Signin', err.statusText, err.data.error.en, 1);
	                    }
	                    console.log("An error occured while communicating with Synapse");
	                    console.log(JSON.stringify(err));
	                    alert(err.data.error.en);
	                });
		        }
		    })
        })
    };
})

// Controller for tab-Manual-Account
.controller('ManualAccountCtrl', function($scope, $state, $stateParams, $rootScope, $cipherFactory, $cordovaDevice, $firebaseArray, $cipherFactory, $http, $ionicLoading, $ionicPopup, $ionicHistory, $ionicNavBarDelegate) {
	
	// Clear the forms
    $scope.user = {
        nickname: '',
        accountNumber: '',
        routingNumber: '',
        type: '',
        class: ''
    };
	
	var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid);
    var fbUser = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid + "/Payments");
    var ref = new Firebase("https://walletbuddies.firebaseio.com");
    
	$scope.connect = function(user) {
        $ionicLoading.show({
            template: 'Loading..Hold tight.'
        });
        if(user.accountNumber.length != 12) {
	        $ionicLoading.hide();
	        $ionicPopup.alert({
                title: "Invalid Account Number",
                template: "Please make sure the account number you entered is a 12 digit number!"
            });
        } else if(user.routingNumber.length != 9) {
	        $ionicLoading.hide();
	        $ionicPopup.alert({
                title: "Invalid Routing Number",
                template: "Please make sure the routing number you entered is a 9 digit number!"
            });
        } else if(user.type == "" || user.class == "" || user.nickname == "") {
	        $ionicLoading.hide();
	        $ionicPopup.alert({
                title: "Required Field",
                template: "Please make sure all fields are entered!"
            });
        } else {
	        fbRef.once('value', function(userData) {
		        ref.child('SynapsePay').once('value', function(data) {
			        
		        	// Check if SynapsePay account exists
			        if (!userData.child("Payments").exists()) {			        
						// Create a SynapsePay user account
						// get host ip address of client
						var json = 'http://ipv4.myexternalip.com/json';
						$http.get(json).then(function(result) {
							var ip = result.data.ip;
							var uuid = $cordovaDevice.getUUID();
							console.log("uuid: " + uuid);
							console.log("IP ADDRESS: " + ip);
			                $http.post('https://synapsepay.com/api/v3/user/create', {
			                    "client": {
			                        //your client ID and secret
			                        "client_id": data.val().client_id,
			                        "client_secret": data.val().client_secret
			                    },
			                    "logins": [
			                        //email and password of the user. Passwords are optional.
			                        //yes you can add multiple emails and multiple users for one account here
			                        {
			                            "email": userData.val().email,
			                            "read_only": false
			                        }
			                    ],
			                    "phone_numbers": [
			                        //user's mobile numbers. Can be used for 2FA
			                        userData.val().phonenumber
			                    ],
			                    "legal_names": [
			                        //user's legal names. If multiple user's are being added, add multiple legal names.
			                        //If business account, add the name of the person creating the account and the name of the company
			                        userData.val().firstname + " " + userData.val().lastname
			                    ],
			                    "fingerprints": [
			                        //fingerprints of the devices that you will be accessing this account from
			                        {
			                            "fingerprint": uuid
			                        }
			                    ],
			                    "ips": [
			                        //user's IP addresses
			                        ip
			                    ],
			                    "extra": {
			                        //optional fields
			                        "note": "WalletBuddies User",
			                        "supp_id": "No IDs Here",
			                        //toggle to true if its a business account
			                        "is_business": false
			                    }
			                }).then(function(response) {
			                    console.log("SYNAPSEPAY response " + JSON.stringify(response));
			                    // Save the returned oauth and refresh tokens
			                    fbRef.child("Payments/oauth").update({
			                        oauth_key: $cipherFactory.encrypt(response.data.oauth.oauth_key, $rootScope.fbAuthData.uid), // We need this for making bank transactions, every user has a unique key.
			                        refresh_token: $cipherFactory.encrypt(response.data.oauth.refresh_token, $rootScope.fbAuthData.uid),
			                        expires_at: response.data.oauth.expires_at,
			                        expires_in: response.data.oauth.expires_in,
			                        client_id: response.data.user.client.id,
			                        fingerprint: uuid,
			                        ip: ip,
			                        oid: response.data.user._id.$oid
			                    });
			                }).catch(function(err) {
			                    if(typeof analytics !== undefined) {
			                        analytics.trackEvent('SynapsePay ConnectCtrl', err.statusText, err.data.error.en, 1);
			                    }
			                    console.log("An error occured while communicating with Synapse");
			                    console.log(JSON.stringify(err));
			                });
			            }, function(e) {
			                if(typeof analytics !== undefined) {
			                    analytics.trackEvent('IP Address', 'Error Validating', 'In AccountCtrl', e);
			                }
							alert("An error occured while validating your ip address");
						});
			        } else {
				        //Sign in to the user's Synapse Account to refresh the authToken
				        var refresh_token = $cipherFactory.decrypt(userData.val().Payments.oauth.refresh_token.cipher_text, $rootScope.fbAuthData.uid, userData.val().Payments.oauth.refresh_token.salt, userData.val().Payments.oauth.refresh_token.iv);
				        console.log("Signin REFRESH TOKEN: " + refresh_token);
				        $http.post('https://synapsepay.com/api/v3/user/signin', {
			                "client": {
							    //your client ID and secret
							    "client_id": data.val().client_id,  
							    "client_secret": data.val().client_secret
							},
							  "login":{
							    //Instead of email and password, you can specify refresh_token of the user as well.
							    "refresh_token": refresh_token
							},
							  "user":{
							    //the id of the user profile that you wish to sign into.
							    "_id":{
							      "$oid": userData.val().Payments.oauth.oid
							},
							    "fingerprint": userData.val().Payments.oauth.fingerprint,
							    "ip": userData.val().Payments.oauth.ip
							}
			            }).then(function(response) {
		                    console.log("SYNAPSEPAY SIGNIN response " + JSON.stringify(response));
		                    // Save the oauth and refresh tokens
		                    fbRef.child("Payments/oauth").update({
		                        oauth_key: $cipherFactory.encrypt(response.data.oauth.oauth_key, $rootScope.fbAuthData.uid), // We need this for making bank transactions, every user has a unique key.
		                        refresh_token: $cipherFactory.encrypt(response.data.oauth.refresh_token, $rootScope.fbAuthData.uid),
		                        expires_at: response.data.oauth.expires_at,
		                        expires_in: response.data.oauth.expires_in
		                    });
		                    
							// Connect to the user's bank
							//Decipher oauth keys before POST
				            var oauth_key = $cipherFactory.decrypt(userData.val().Payments.oauth.oauth_key.cipher_text, $rootScope.fbAuthData.uid, userData.val().Payments.oauth.oauth_key.salt, userData.val().Payments.oauth.oauth_key.iv);
				            console.log("oauth_key " + oauth_key);			
				            // $http post for Bank Login
				            $http.post('https://synapsepay.com/api/v3/node/add', {
					            'login':{
								    'oauth_key': oauth_key
								},
								'user':{
								    'fingerprint': userData.val().Payments.oauth.fingerprint
								},
								'node':{
								    'type':'ACH-US',
								    'info':{
								      'nickname': user.nickname,
								      'account_num': user.accountNumber,
								      'routing_num': user.routingNumber,
								      'type': user.type,
								      'class': user.class
								    },
								    'extra':{
								      'supp_id': $rootScope.fbAuthData.uid
								    }
								}
				            }).then(function(payload) {
				                // Clear the forms
				                $scope.user = {
				                    nickname: '',
				                    accountNumber: '',
				                    routingNumber: '',
				                    type: '',
				                    class: ''
				                };
				                if (payload.data.success) {
					                console.log('payload.data.success Manual:', JSON.stringify(payload));
				                    if (payload.data.nodes[0].allowed == null) {
				                        $rootScope.question = payload.data;
				                        $ionicLoading.hide();
				                        $state.go('tab.auth-question');
				                    } else {
				                        $rootScope.data = payload.data;
				                        $ionicLoading.hide();
				                        $state.go('tab.choose-account');
				                    }
				                }
				            }).catch(function(err) {
				                $ionicLoading.hide();
				                console.log("Got an error in bank login.");
				                console.log(JSON.stringify(err));
				                if (err.statusText == 'CONFLICT') {
					                $ionicPopup.alert({
						                title: "Incorrect Credentials",
						                template: "Either your Account Number or Routing Number is incorrect!"
						            });
				                }
				                if (err.statusText == 'BAD REQUEST') {
					                $ionicPopup.alert({
						                title: "Incorrect Credentials",
						                template: "Either your Account Number or Routing Number is incorrect!"
						            });
				                }
				            });
		                }).catch(function(err) {
			                $ionicLoading.hide();
		                    if(typeof analytics !== undefined) {
		                        analytics.trackEvent('SynapsePay ConnectCtrl Signin', err.statusText, err.data.error.en, 1);
		                    }
		                    console.log("An error occured while communicating with Synapse");
		                    console.log(JSON.stringify(err));
		                    alert(err.data.error.en);
		                });
			        }
			    })	        
	        })
        }
        
        /*
        fbRef.child("Payments/oauth").once('value', function(data) {
            //Decipher oauth keys before POST
            var oauth_key = $cipherFactory.decrypt(data.val().oauth_key.cipher_text, $rootScope.fbAuthData.uid, data.val().oauth_key.salt, data.val().oauth_key.iv);
            var refresh_token = $cipherFactory.decrypt(data.val().refresh_token.cipher_text, $rootScope.fbAuthData.uid, data.val().refresh_token.salt, data.val().refresh_token.iv);
            console.log("oauth_key " + oauth_key);
            console.log("refresh_token " + refresh_token);

            // $http post for Bank Login
            $http.post('https://synapsepay.com/api/v3/node/add', {
                'login': {
                    'oauth_key': oauth_key
                },
                'user': {
                    'fingerprint': data.val().fingerprint
                },
                'node': {
                    'type': 'ACH-US',
                    'info': {
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
                if (payload.data.success) {
                    if (payload.data.nodes[0].allowed == null) {
                        $rootScope.question = payload.data;
                        $ionicLoading.hide();
                        $state.go('tab.auth-question');
                    } else {
                        $rootScope.data = payload.data;
                        $ionicLoading.hide();
                        $state.go('tab.choose-account');
                    }
                }
            }).catch(function(err) {
                $ionicLoading.hide();
                if(typeof analytics !== undefined) {
                    analytics.trackEvent('Bank Login ConnectCtrl', err.statusText, err.data.error.en, 1);
                }
                console.log("Got an error in bank login.");
                console.log(JSON.stringify(err));
                if (err.statusText == 'CONFLICT') {
	                $ionicPopup.alert({
		                title: "Incorrect Credentials",
		                template: "Either your Online ID or password is incorrect!"
		            });
                }
                if (err.statusText == 'BAD REQUEST') {
	                $ionicPopup.alert({
		                title: "Select your Bank",
		                template: "Please make sure you've selected your bank from the drop down!"
		            });
                }
                //alert(err.statusText);
            });
        });*/
    };
})

// Controller for Choose-Account
.controller('ChooseAccCtrl', function($scope, $rootScope, $state, $cipherFactory, $ionicPopup) {

    $scope.data = $rootScope.data;

    $scope.checkSelect = function(index) {
        console.log('array khan index is ' + index);
        $scope.temp = index;
    }

    $scope.check = {
        data: false
    };

    $scope.TC = function(index) {
        console.log('array index is ' + index + $scope.check.data);
        var checked = index;
    }

    $scope.validateUser = function() {
        if ($scope.check.data) {
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
        } else {
            $ionicPopup.alert({
                title: "Terms and Conditions",
                template: "You need to agree to terms and conditions in order to continue!"
            });
        }
    };
})

// Controller for providing KYC details.
.controller('KycCtrl', function($scope, $rootScope, $state, $ionicActionSheet, $cordovaCamera, $ionicLoading, $cipherFactory, $http, $ionicPopup) {

    $scope.data = $rootScope.data;

    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);

    // For selecting a photo
    $scope.selectPicture = function() {
        // Show the action sheet
        var hideSheet = $ionicActionSheet.show({
            buttons: [{
                text: 'Choose Photo'
            }, {
                text: 'Take Photo'
            }],
            cancelText: 'Cancel',
            cancel: function() {
                // add cancel code..
            },
            buttonClicked: function(index) {
                if (index == 0) {
                    hideSheet();
                    var options = {
                        quality: 75,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 600,
                        targetHeight: 600,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        $scope.imageDoc = "data:image/jpeg;base64," + imageData;
                    }, function(err) {
                        $ionicLoading.show({
                            template: 'No Photo Selected',
                            duration: 1000
                        });
                    });
                }

                if (index == 1) {
                    hideSheet();
                    var options = {
                        quality: 75,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.CAMERA,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 600,
                        targetHeight: 600,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        $scope.imageDoc = "data:image/jpeg;base64," + imageData;
                    }, function(err) {
                        $ionicLoading.show({
                            template: 'No Photo Selected',
                            duration: 1000
                        });
                    });
                }
            }
        });
    };

    $scope.validateUser = function(user) {
        // Check if user has uploaded a image
        if ($scope.imageDoc == null) {
            $ionicPopup.alert({
                title: "Photo Needed",
                template: "Please upload your photo to continue."
            });
        } else {
            $ionicLoading.show({
                template: 'Loading..Hold tight.'
            });
            fbRef.once("value", function(data) {
                //Decipher oauth keys before POST
                var oauth_key = $cipherFactory.decrypt(data.val().Payments.oauth.oauth_key.cipher_text, $rootScope.fbAuthData.uid, data.val().Payments.oauth.oauth_key.salt, data.val().Payments.oauth.oauth_key.iv);
                console.log("USER IMAGE: " + $scope.imageDoc);

                $http.post('https://synapsepay.com/api/v3/user/doc/add', {
                    'login': {
                        'oauth_key': oauth_key
                    },
                    'user': {
                        'doc': {
                            'birth_day': user.day,
                            'birth_month': user.month,
                            'birth_year': user.year,
                            'name_first': data.val().firstname,
                            'name_last': data.val().lastname,
                            'address_street1': user.street,
                            //'address_city': user.city,
                            'address_postal_code': user.zip,
                            'address_country_code': 'US',
                            'document_value': user.ssn.toString(),
                            'document_type': 'SSN',
                        },
                        'fingerprint': data.val().Payments.oauth.fingerprint
                    }
                }).then(function(payload) {
                    console.log("KYC" + JSON.stringify(payload));
                    // POST for submitting user image
                    $http.post('https://synapsepay.com/api/v3/user/doc/attachments/add', {
                        'login': {
                            'oauth_key': oauth_key
                        },
                        'user': {
                            'doc': {
                                'attachment': $scope.imageDoc
                            },
                            'fingerprint': data.val().Payments.oauth.fingerprint
                        }
                    }).then(function(data) {
                        console.log(data);
                        console.log("DOCUMENT: " + JSON.stringify(data));
                    }).catch(function(err) {
                        if(typeof analytics !== 'undefined') {
                            analytics.trackEvent('user/doc/attachments/add In KycCtrl', err.statusText, err.data.error.en, 1);
                        }
                        console.log(err);
                        console.log(JSON.stringify(err));
                        alert(err.statusText);
                    });

                    if (payload.data.http_code == "200") {
                        fbRef.child("Payments").child("KYC").update({
                            oid: payload.data.user._id.$oid,
                            clientid: payload.data.user.client.id
                        });
                        $ionicLoading.hide();
                        $ionicPopup.alert({
                            title: "You're all set!",
                            template: "Your verification is complete"
                        });

                        // Get a reference to the NewsFeed of the user
                        var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
                        var dt = Date.now();
                        var feedToPush = "Yay!! Your bank account was linked successfully!";

                        // Append new data to this FB link
                        fbNewsFeedRef.push({
                            feed: feedToPush,
                            icon: "ion-checkmark",
                            color: "my-icon",
                            time: dt
                        });

                        // Record entry into Account Verification Complete
                        if(typeof analytics !== 'undefined') {
                            analytics.trackView("Account Verification Complete");
                            analytics.trackEvent('KycCtrl', 'Pass', 'In KycCtrl', 112);
                        }

                        $state.go("tab.settings");
                    } else {
                        $ionicLoading.hide();
                        $ionicPopup.alert({
                            title: "We need a little more info from you",
                            template: "Please bear with us :)"
                        });
                        $rootScope.kycQuestions = payload.data;
                        $state.go("tab.kyc-questions");
                    }
                }).catch(function(err) {
                    if(typeof analytics !== 'undefined') {
                        analytics.trackEvent('/v3/user/doc/add In KycCtrl', err.statusText, err.data.error.en, 1);
                    }
                    $ionicLoading.hide();
                    if (err.data.http_code == "409" || err.data.http_code == "401" && err.data.error.en != "Error verifying document. Please contact us to learn more.") {
	                    $ionicPopup.alert({
                            title: "We were unable to verify your SSN",
                            template: "You need to provide a picture of your Drivers License or Passport!"
                        });
                        $state.go("tab.document-upload");
                    } else {
	                	alert(err.data.error.en);
                    }
                    console.log("Attachment" + JSON.stringify(err));
                });
            });
        };
    };
})

.controller('DocUploadCtrl', function($scope, $rootScope, $state, $ionicActionSheet, $cordovaCamera, $ionicLoading, $cipherFactory, $http, $ionicPopup) {

	var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);

	// For selecting a photo
    $scope.selectPicture = function() {
        // Show the action sheet
        var hideSheet = $ionicActionSheet.show({
            buttons: [{
                text: 'Choose Photo'
            }, {
                text: 'Take Photo'
            }],
            cancelText: 'Cancel',
            cancel: function() {
                // add cancel code..
            },
            buttonClicked: function(index) {
                if (index == 0) {
                    hideSheet();
                    var options = {
                        quality: 75,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 600,
                        targetHeight: 600,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        $scope.imageDoc = "data:image/jpeg;base64," + imageData;
                    }, function(err) {
                        // error
                        $ionicLoading.show({
                            template: 'No Photo Selected',
                            duration: 1000
                        });
                    });
                }

                if (index == 1) {
                    hideSheet();
                    var options = {
                        quality: 75,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.CAMERA,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 600,
                        targetHeight: 600,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        $scope.imageDoc = "data:image/jpeg;base64," + imageData;
                    }, function(err) {
                        // error
                        $ionicLoading.show({
                            template: 'No Photo Selected',
                            duration: 1000
                        });
                    });
                }
            }
        });
    };

    // When user clicks finish submit the photo
    $scope.upload = function() {
        // Check if user has uploaded a image
        if ($scope.imageDoc == null) {
            $ionicPopup.alert({
                title: "Photo Needed",
                template: "Please upload your photo to continue."
            });
        } else {
            $ionicLoading.show({
                template: 'Submitting your data...hold on.'
            });
            fbRef.once("value", function(data) {
                //Decipher oauth keys before POST
                var oauth_key = $cipherFactory.decrypt(data.val().Payments.oauth.oauth_key.cipher_text, $rootScope.fbAuthData.uid, data.val().Payments.oauth.oauth_key.salt, data.val().Payments.oauth.oauth_key.iv);
                console.log("USER GOVT ID: " + $scope.imageDoc);
                $http.post('https://synapsepay.com/api/v3/user/doc/attachments/add', {
                    'login': {
                        'oauth_key': oauth_key
                    },
                    'user': {
                        'doc': {
                            'attachment': $scope.imageDoc
                        },
                        'fingerprint': data.val().Payments.oauth.fingerprint
                    }
                }).then(function(res) {
                    console.log("DOCUMENT: " + JSON.stringify(res));
                    $ionicLoading.hide();
                    if (res.data.http_code == "200") {
	                    $ionicPopup.alert({
			                title: "Thanks!! You're all set now :)",
			                template: "And we're sorry that last step was a pain in the arse :("
			            });
			            fbRef.child("Payments").child("KYC").update({
                            oid: res.data.user._id.$oid,
                            clientid: res.data.user.client.id
                        });
                        // Get a reference to the NewsFeed of the user
                        var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
                        var dt = Date.now();
                        var feedToPush = "Yay!! Your bank account was linked successfully!";

                        // Append new data to this FB link
                        fbNewsFeedRef.push({
                            feed: feedToPush,
                            icon: "ion-checkmark",
                            color: "my-icon",
                            time: dt
                        });
                        $state.go("tab.settings");
                    } else {
	                    $ionicPopup.alert({
			                title: "Something went wrong!!",
			                template: "We were not able to upload your image."
			            });
                    }
                }).catch(function(err) {
	                $ionicLoading.hide();
                    console.log(err);
                    console.log(JSON.stringify(err));
                    alert(err.statusText);
                });
            });
        }
    };
})

.controller('KycQuestionCtrl', function($scope, $rootScope, $state, $ionicLoading, $cipherFactory, $http, $ionicPopup) {

    $scope.data = $rootScope.kycQuestions.question_set;
    console.log("Questions: ", $scope.data.questions);
    $scope.selection = {};

    $scope.validate = function() {
        $ionicLoading.show({
            template: 'Loading..Hold tight.'
        });
        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);
        fbRef.child("Payments/oauth").once('value', function(data) {
            //Decipher oauth keys before POST
            var oauth_key = $cipherFactory.decrypt(data.val().oauth_key.cipher_text, $rootScope.fbAuthData.uid, data.val().oauth_key.salt, data.val().oauth_key.iv);

            $http.post('https://synapsepay.com/api/v3/user/doc/verify', {
                'login': {
                    'oauth_key': oauth_key
                },
                'user': {
                    'doc': {
                        'question_set_id': $scope.data.id,
                        'answers': [{
                            'question_id': 1,
                            'answer_id': $scope.selection.answer[1]
                        }, {
                            'question_id': 2,
                            'answer_id': $scope.selection.answer[2]
                        }, {
                            'question_id': 3,
                            'answer_id': $scope.selection.answer[3]
                        }, {
                            'question_id': 4,
                            'answer_id': $scope.selection.answer[4]
                        }, {
                            'question_id': 5,
                            'answer_id': $scope.selection.answer[5]
                        }]
                    },
                    'fingerprint': data.val().fingerprint
                }
            }).then(function(payload) {
                $ionicLoading.hide();
                $ionicPopup.alert({
                    title: "You're all set!",
                    template: "Your SSN information was verified."
                });
                fbRef.child("Payments").child("KYC").update({
                    oid: payload.data.user._id.$oid,
                    clientid: payload.data.user.client.id
                });

                // Get a reference to the NewsFeed of the user
                var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
                var dt = Date.now();
                var feedToPush = "Yay!! Your bank account was linked successfully!";

                // Append new data to this FB link
                fbNewsFeedRef.push({
                    feed: feedToPush,
                    icon: "ion-checkmark",
                    color: "my-icon",
                    time: dt
                });
                $state.go("tab.settings");

            }).catch(function(err) {
                if(typeof analytics !== 'undefined') {
                    analytics.trackEvent('/v3/user/doc/verify KycQuestionCtrl', err.statusText, err.data.error.en, 1);
                }
                $ionicLoading.hide();
                console.log(err);
                console.log("Error Message in JSON: " + JSON.stringify(err));

                // Popup for wrong answer
                if (err.status == 400) {
                    $ionicLoading.hide();
                    $ionicPopup.alert({
                        title: "Wrong Answer!",
                        template: "Please try again."
                    });
                } else {
                    alert(err.data.error.en);
                }
            })
        });
    };
})

// Controller for Auth-Question
.controller('QuestionCtrl', function($scope, $rootScope, $ionicLoading, $state, $cipherFactory, $http, $ionicPopup) {

    $scope.question = $rootScope.question;
    $scope.authStep = function(user) {
        $ionicLoading.show({
            template: 'Loading..Hold tight.'
        });
        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);
        fbRef.child("Payments/oauth").once('value', function(data) {
            //Decipher oauth keys before POST
            var oauth_key = $cipherFactory.decrypt(data.val().oauth_key.cipher_text, $rootScope.fbAuthData.uid, data.val().oauth_key.salt, data.val().oauth_key.iv);

            $http.post('https://synapsepay.com/api/v3/node/verify', {
                'login': {
                    'oauth_key': oauth_key
                },
                'user': {
                    'fingerprint': data.val().fingerprint
                },
                'node': {
                    '_id': {
                        '$oid': $scope.question.nodes[0]._id.$oid
                    },
                    'verify': {
                        'mfa': user.answer
                    }
                }
            }).then(function(payload) {
                $ionicLoading.hide();
                if (payload.data.nodes[0].allowed == null) {
                    $rootScope.question = payload.data;
                    $scope.question = $rootScope.question;
                    user.answer = '';
                    $state.go('tab.auth-question');
                } else {
                    $rootScope.data = payload.data;
                    console.log("payload: " + JSON.stringify(payload.data));
                    $state.go('tab.choose-account');
                }
            }).catch(function(err) {
                if(typeof analytics !== 'undefined') {
                    analytics.trackEvent('MFA QuestionCtrl', err.statusText, err.data.error.en, 1);
                }
                $ionicLoading.hide();
                console.log("Got an error in MFA - QuestionCtrl.");
                console.log(err);
                console.log("Error Message in JSON: " + JSON.stringify(err));

                // Popup for wrong answer
                if (err.status == 400) {
                    $ionicPopup.alert({
                        title: "Wrong Answer!",
                        template: "Please try again."
                    });
                } else {
                    alert(err.data.error.en);
                }
            });
        })
    }
    $scope.user = {
        answer: ''
    };
})

// Controller for Auth-Question page
.controller('MFACtrl', function($scope, $rootScope, $ionicLoading, $state, $cipherFactory, $http, $ionicPopup) {

    $scope.mfa = $rootScope.mfa;
    $scope.authStep = function(user) {
        $ionicLoading.show({
            template: 'Loading..Hold tight.'
        });
        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);
        fbRef.child("Payments/oauth").once('value', function(data) {
            //Decipher oauth keys before POST
            var oauth_key = $cipherFactory.decrypt(data.val().oauth_key.cipher_text, $rootScope.fbAuthData.uid, data.val().oauth_key.salt, data.val().oauth_key.iv);

            $http.post('https://synapsepay.com/api/v2/bank/mfa', {
                access_token: $scope.mfa.response.access_token,
                mfa: user.answer,
                bank: $rootScope.bank,
                oauth_consumer_key: oauth_key
            }).then(function(payload) {
                $ionicLoading.hide();
                $rootScope.data = payload.data;
                $state.go('tab.choose-account');
            }).catch(function(err) {
                if(typeof analytics !== 'undefined') {
                    analytics.trackEvent('MFA in MFACtrl', err.statusText, err.data.error.en, 1);
                }
                $ionicLoading.hide();
                console.log("Got an error in MFA - MFACtrl.");
                console.log(err);

                // Popup for wrong answer
                if (err.status == 400) {
                    $ionicPopup.alert({
                        title: "Wrong Code!",
                        template: "Please try again."
                    });
                } else {
                    alert(err.data.error.en);
                }
            });
        })
    }
    $scope.user = {
        answer: ''
    };
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
    $scope.chat = Chats.get($stateParams.chatId);
})

.controller('HelpCtrl', function($scope, $state, $ionicSlideBoxDelegate) {

    $scope.close = function() {
	    $state.go('tab.wallet');
    }
    $scope.next = function() {
	  	$ionicSlideBoxDelegate.next();
  	};

  	$scope.previous = function() {
    	$ionicSlideBoxDelegate.previous();
  	};

  	$scope.slides = [{name:"1"},{name:"2"},{name:"3"},{name:"4"}];

  	// Called each time the slide changes
  	$scope.slideChanged = function(index) {
    	$scope.slideIndex = index;
  	};

})

.controller('FriendDetailCtrl', function($scope, $stateParams, Friends) {
    $scope.friend = Friends.get($stateParams.friendId);
})

.controller('HomeCtrl', function($scope, $rootScope, $firebaseArray, $sce) {
    // Get a reference to the NewsFeed of the user
    var badgeRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child('Badges');
    var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
	$scope.$on('$ionicView.enter', function() {
		badgeRef.update({
			feedCounter: 0
		});
	});
    // Get only the last 25 feed messages
    var fbLimitedFeed = fbNewsFeedRef.orderByChild("timestamp").limitToLast(25);

    // Link to $scope to have 3-way data binding
    $scope.newsfeed = $firebaseArray(fbLimitedFeed);

    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("Transactions");
    // all server changes are applied in realtime
    $scope.transactions = $firebaseArray(fbRef);

    $scope.renderHTML = function(html_code) {
        return $sce.trustAsHtml(html_code);
    };
})
