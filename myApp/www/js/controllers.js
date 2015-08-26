angular.module('starter.controllers', [])

// Controller for Launch page
.controller('LaunchCtrl', function($scope, $state, $rootScope) {
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
            console.log("Not authenticated");
        }
    });
})

// Controller for Account Creation and Sign Up
.controller('AccountCtrl', function($scope, $firebaseObject, $ionicPopup, $state, $ionicLoading, $rootScope, $log, $firebaseAuth, $http, $cordovaPush, $cipherFactory) {
	
	$scope.check = {data:true};
	$scope.TC = function(index) {
        console.log('array index is ' + index + $scope.check.data);
        var checked = index;
    }
	    
    // Function to do the Sign Up and Add the Account
    $scope.addAccount = function(account) {
	    // Check if terms and conditions are accepted
		if($scope.check.data) {
	        // Make sure all the fields have a value
	        if (!account.email || !account.password || !account.firstname || !account.lastname || !account.phonenumber) {
	            alert("Please enter all credentials");
	        } else {
	            console.log("All fields entered");
	
	            // Get a reference to the Firebase account
	            var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
	            // Validating if phone number has 10 digits
	            if (account.phonenumber.length > 10) {
	                alert("Please enter a valid 10 digit phone number.");
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
	                                alert("The new user account cannot be created because the email is already in use.");
	                                break;
	                            case "INVALID_EMAIL":
	                                alert("The specified email is not a valid email.");
	                                break;
	                            default:
	                                alert("Error creating user.");
	                        }
	                    } else {
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
	                                        var circleID = value;
	                                        console.log("Invites path: " + fbInvites + circleID);
	                                        fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child(circleID).update({
	                                            Status: "pending"
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
								
								var email = account.email;
								var number = account.phonenumber.toString();
								var first = account.firstname;
								var last = account.lastname;
								
	                            //$ionicLoading.show({template: 'Welcome! You\'re signed up!', duration:1500});
								console.log("SynapsePay User1: " + account.email, account.phonenumber.toString(), account.firstname + " " + account.lastname);
								fbRef.child('SynapsePay').once('value', function(data) {
									// Create a SynapsePay user account
									console.log("SynapsePay User: " + data.val().client_id + data.val().client_secret + email + number + first + " " + last);
		                            $http.post('https://sandbox.synapsepay.com/api/v3/user/create', {
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
			                            console.log("SYNAPSEPAY response " + JSON.stringify(response));
		                                fbUser.child("Payments/oauth").update({
		                                    oauth_key: $cipherFactory.encrypt(response.data.oauth.oauth_key, $rootScope.fbAuthData.uid), // We need this for making bank transactions, every user has a unique key.
		                                    refresh_token: $cipherFactory.encrypt(response.data.oauth.refresh_token, $rootScope.fbAuthData.uid),
		                                    expires_at: response.data.oauth.expires_at,
		                                    expires_in: response.data.oauth.expires_in,
		                                    client_id: response.data.user.client.id,
		                                    fingerprint: "suasusau21324redakufejfjsf",
		                                    oid: response.data.user._id.$oid
		                                });
		
		                            }).catch(function(err) {
		                                console.log("An error occured while communicating with Synapse");
		                                console.log(JSON.stringify(err));
		                            });	
								})
	
	                            // Clear the form
	                            account.firstname = '';
	                            account.lastname = '';
	                            account.email = '';
	                            account.phonenumber = '';
	                            account.password = '';
	
	                            // Get a reference to the NewsFeed of the user
	                            var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
	
	                            var feedToPush = "Welcome to WalletBuddies, your account was succesfully set up!";
	
	                            // Append new data to this FB link
	                            fbNewsFeedRef.push({
	                                feed: feedToPush,
	                                icon: "ion-happy-outline"
	                            });
	
	                            // Switch to the Wallet Tab
	                            $state.go('tab.wallet');
	
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
	                                        alert("Registration error: " + err);
	                                    });
	                                }
	                            });
	                        }).catch(function(error) {
	                            console.error("Authentication failed: " + error);
	                        });
	                    }
	                });
	        }
	    }
	    else {
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
                        $ionicPopup.alert({
                            title: "Email not in the system!",
                            template: "Please enter the right email."
                        });
                        break;
                    default:
                        console.log("Error resetting password:", error);
                }
            } else {
                $ionicPopup.alert({
                    title: "Temporary password sent"
                });
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
                        console.log("Error changing password:", error);
                }
            } else {
                $ionicPopup.alert({
                    title: "Password changed successfully!"
                });
                $state.go('tab.settings');
            }
        });
    }
})


// Controller for Sign In
.controller('SignInCtrl', ['$scope', '$state', '$rootScope', 'fbCallback',
    function($scope, $state, $rootScope, fbCallback, $ionicHistory) {

        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

        $scope.user = {
            email: "sunku@fb.com",
            password: "deepesh"
        };

        // Called when the user clicks the "Forgot Password" button
        $scope.forgotPassword = function() {
            // Go to the forgot password page
            $state.go('forgotpassword');
        }

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

                                    // The data is ready, switch to the Wallet tab
                                    $state.go('tab.wallet');
                                });
                                //}
                            });
                        } else {
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
.controller('GroupCtrl', function($scope, $cordovaCamera, $ionicActionSheet, $ionicLoading, $firebaseObject, ContactsService, fbCallback, $cordovaContacts, $rootScope, $state, $log, $ionicPopup) {

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
                        quality: 50,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 100,
                        targetHeight: 100,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                    }, function(err) {
                        // error
                        $ionicLoading.show({
                            template: 'Error choosing photo',
                            duration: 1000
                        });
                    });
                }
                if (index == 1) {
                    hideSheet();
                    var options = {
                        quality: 50,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.CAMERA,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 100,
                        targetHeight: 100,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                    }, function(err) {
                        // error
                        $ionicLoading.show({
                            template: 'Error choosing photo',
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
        for (var i = 0; i < $scope.data.selectedContacts.length; i++) {
            var str = $scope.data.selectedContacts[i].phones[0].value;
            console.log("Before str.replace: " + $scope.data.selectedContacts[i].phones[0].value);
            $scope.data.selectedContacts[i].phones[0].value = str.replace(/\D/g, '');
            console.log("After str.replace: " + $scope.data.selectedContacts[i].phones[0].value);
            var temp = $scope.data.selectedContacts[i].phones[0].value;
            var temp = $scope.data.selectedContacts[i].phones[0].value;
            console.log(" second temp_int =" + temp.length);
            // Removing 1 from the phone number
            if (temp.length > 10){
               var temp = temp.substring(1);
               var temp_int = parseInt(temp);
            }
            $scope.data.selectedContacts[i].phones[0].value = temp_int;
        }

        // Save data to a local var
        var groupName = user.groupName;
        var plan = user.plan;
        var amount = user.amount;
        var groupMessage = user.groupMessage;

        // Get the reference for the push
        var fbCirclePushRef = fbCircle.push();

        // Get the unique ID generated by push()
        var groupID = fbCirclePushRef.key();

        // Append new data to this FB link
        fbCirclePushRef.update({
            circleName: groupName,
            circleID: groupID,
            plan: plan,
            amount: amount,
            groupMessage: groupMessage,
            contacts: $scope.data.selectedContacts,
            circlePhoto: $scope.imageSrc
        });


        fbRef.child("Users").child($rootScope.fbAuthData.uid).once('value', function(userData) {
            // Save invitor name
            fbCirclePushRef.update({
                invitorName: userData.val().firstname + userData.val().lastname,
                invitorPhoto: userData.val().profilePhoto
            });
        });

        // Writing circle ID to the user's path and set Status to true
        fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child(groupID).update({
            Status: true
        });

        // Writing UserID under CircleID and set Status to true and initialize notification counter badge to 0
        fbRef.child("Circles").child(groupID).child("Members").child($rootScope.fbAuthData.uid).update({
            Status: true,
            badgeCounter: 0
        });

        // Save the timestamp to trigger the circle-start-scheduler
        var date = Firebase.ServerValue.TIMESTAMP;
        console.log("Firebase.ServerValue.TIMESTAMP" + date);
        fbRef.child('StartDate').push({
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
                var temp = parseInt($scope.data.selectedContacts[i].phones[0].value);
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
                        fbInvites.update({
                            circleID: groupID
                        });

                        // Save data for sending email notification
                        var email = $scope.data.selectedContacts[i].emails[0];
                        var phone = $scope.data.selectedContacts[i].phones[0];

                        fbCallback.fetch(fbProfile, function(output) {
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
                            } else if (email) {
                                // Write email info to /Sendgrid folder to trigger the server to send email
                                fbRef.child('Sendgrid').push({
                                    from: 'hello@walletbuddies.co',
                                    to: email.value,
                                    subject: "You've been invited to form a Circle on WalletBuddies by " + fbName,
                                    text: fbName + " has invited you to the " + groupName + " Circle on WalletBuddies. Click here: www.walletbuddies.com to join this Circle. Have fun. :)"
                                });
                                console.log("Invites sent by: " + fbName + " for circle: " + groupName + " to " + email.value);
                            } else {
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
            template: "Your invites are one their way. :)"
        });

        // Get a reference to the NewsFeed of the user
        var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");

        var feedToPush = "You created a new social group " + "<b>" + groupName + "</b>";

        // Append new data to this FB link
        fbNewsFeedRef.push({
            feed: feedToPush,
            icon: "ion-ios7-chatboxes-outline"
        });

        // The data is ready, switch to the Wallet tab
        $state.go('tab.wallet');
    }
})

// Controller for Wallet tab
.controller('WalletCtrl', function($scope, $state, $ionicPopup, $rootScope, fbCallback, $firebaseArray) {

    // Check if user has linked a bank account before he can start a circle
    $scope.newCircle = function() {
        var fbUser = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid + "/Payments");
        fbUser.once("value", function(data) {
            // Check if user's bank account is linked and KYC verified
            if (data.child("Bank").exists() && data.child("KYC").exists()) {
                $state.go("tab.socialcircle");
            } else {
                $ionicPopup.alert({
                    title: "You haven't linked your bank account yet!",
                    template: "You can start a new circle once you've linked an account. Please go to settings to link an account."
                });
            }
        });
    };
	
	$scope.id = $rootScope.fbAuthData.uid;
	console.log("IDesh: " + $scope.id);
    // Get a reference to the Firebase account
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

    // Get a reference to where the User's circle IDs are stored
    var fbUserCircle = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/Circles/");

    // Get a reference to where the User's accepted circles are going to be stored
    var fbUserAcceptedCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");

    // Clear all the data
    fbUserAcceptedCircles.remove();

    // Update $scope.circles
    $scope.circles = $firebaseArray(fbUserAcceptedCircles);

    // Obtain list of circle IDs with a "true" status
    // NOTE: This callback gets called on a 'child_added'	event.
    fbCallback.childAdded(fbUserCircle, true, function(data) {
        console.log("Circles Id(accepted add): " + data.val().Status + data.key());
        var fbCircles = new Firebase(fbRef + "/Circles/" + data.key());
        console.log("Circles FBCircles(accepted add): " + fbCircles);

        // Obtain circle data for the pending circles
        fbCallback.fetch(fbCircles, function(output) {
            var acceptedCircleVal = output;
            // Get the reference for the push
            var fbAcceptedCirclePushRef = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/" + data.key());

            // Update the location(temporary cache)
            fbAcceptedCirclePushRef.update(acceptedCircleVal);
        });
    });

    // Obtain list of circle IDs with a "true" status
    // NOTE: This callback gets called on a 'child_removal'	event.
    fbCallback.childRemoved(fbUserCircle, true, function(data) {
        console.log("Circles Id(accepted removal): " + data.val().Status + data.key());
        var fbCircles = new Firebase(fbRef + "/Circles/" + data.key());
        console.log("Circles FBCircles(accepted removal): " + fbCircles);

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
.controller('WalletDetailCtrl', function($scope, $stateParams, $firebaseObject, $cordovaCamera, $ionicActionSheet, $rootScope, $state, $ionicPopup, $firebaseArray) {
    // Get a reference to the Firebase account
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
    var fbCircles = new Firebase(fbRef + "/Circles/" + $stateParams.circleID);
    var obj = $firebaseObject(fbCircles);
    
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
                        quality: 50,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 100,
                        targetHeight: 100,
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
                        // error
                        $ionicLoading.show({
                            template: 'Error choosing photo',
                            duration: 1000
                        });
                    });
                }
                if (index == 1) {
                    hideSheet();
                    var options = {
                        quality: 50,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.CAMERA,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 100,
                        targetHeight: 100,
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
                        // error
                        $ionicLoading.show({
                            template: 'Error choosing photo',
                            duration: 1000
                        });
                    });
                }
            }
        });
    };
    
    // Creare a link to a CircleMembers under this circle
    var fbCircleMembers = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Members/" + $stateParams.circleID + "/CircleMembers/");
	console.log("FBCIRCLE MEMBERS: " + fbCircleMembers);
    // Clear all the data
    fbCircleMembers.remove();

    // Update $scope.members
    $scope.members = $firebaseArray(fbCircleMembers);

    obj.$loaded().then(function() {
        console.log("loaded record for FBCIRCLE MEMBERS:", obj.$id, obj.Members);
        // To iterate the key/value pairs of the object, use angular.forEach()
        angular.forEach(obj.Members, function(value, key) {
            fbRef.child("Users").child(key).once('value', function(data) {
                // Get the reference for the push
                var fbCircleMembersPushRef = fbCircleMembers.push();
				console.log("FBCIRCLE MEMBERS: " + fbCircleMembersPushRef);
                // Update the location(temporary cache)
                fbCircleMembersPushRef.update({firstName: data.val().firstname});
            });
        })
    })

    $scope.chat = function() {
        $state.go('tab.chat', {
            circleID: $stateParams.circleID
        });
    };
})

// Controller for chat
.controller('ChatCtrl', function($scope, $stateParams, $state, $rootScope, $ionicNavBarDelegate, $timeout, $ionicScrollDelegate, $firebaseArray, $firebaseObject) {
    fbRef = new Firebase("https://walletbuddies.firebaseio.com/Circles/" + $stateParams.circleID + "/Messages/");
    // Create a synchronized array at the firebase reference
    $scope.messages = $firebaseArray(fbRef);
	$scope.focusManager = { focusInputOnBlur: true };
    fbUser = new Firebase("https://walletbuddies.firebaseio.com/Users/").child($rootScope.fbAuthData.uid);
    // Create a synchronized array at the firebase reference
    var user = $firebaseObject(fbUser);
	
	// Updating chat badge counter
	var ref = new Firebase("https://walletbuddies.firebaseio.com");
	// Get a reference to where the User's accepted circles are going to be stored
	var fbUserAcceptedCircles = new Firebase(ref + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");
	fbUserAcceptedCircles.child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).once("value", function(data){
		$rootScope.walletCount = $rootScope.walletCount - data.val().badgeCounter;
		fbUserAcceptedCircles.child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
			badgeCounter: 0
		})
		ref.child("Circles").child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
			badgeCounter: 0
		})
	});
	
	$scope.goBack = function() {
		console.log("Going");
		$state.go('tab.wallet');
	}
    // Scroll down the content automatically
    $scope.$on('$ionicView.enter', function() {
	    console.log("Ionic.view enter");
	    $ionicNavBarDelegate.showBackButton(true);
        $ionicScrollDelegate.scrollBottom(true);
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    });

    // Save the uid to use in the view
    $scope.uid = $rootScope.fbAuthData.uid;

    $scope.hideTime = true;

    var alternate;
    var isIOS = ionic.Platform.isWebView() && ionic.Platform.isIOS();

    $scope.sendMessage = function() {
        alternate = !alternate;

        var d = new Date();
        d = d.toLocaleTimeString().replace(/:\d+ /, ' ');

        $scope.messages.$add({
            userId: $rootScope.fbAuthData.uid,
            text: $scope.data.message,
            time: d,
            name: user.firstname
        });
		
		$ionicScrollDelegate.scrollBottom(true);
		
        fbMembers = new Firebase("https://walletbuddies.firebaseio.com/Circles/").child($stateParams.circleID);
        fbPush = new Firebase("https://walletbuddies.firebaseio.com/");
        var obj = $firebaseObject(fbMembers);
        obj.$loaded().then(function() {
            // To iterate the key/value pairs of the object, use angular.forEach()
            angular.forEach(obj.Members, function(value, key) {
                console.log("key and value pair: " + value + key);
                if ($rootScope.fbAuthData.uid == key) {
	                //do nothing
                }
                else {
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
            delete $scope.data.message;
        })
    };

    // Scroll down when new messages are added
    fbRef.on('child_added', function(data) {
        $timeout(function() {
            $ionicScrollDelegate.scrollBottom(false);
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

    $scope.closeKeyboard = function() {
        // cordova.plugins.Keyboard.close();
    };

    $scope.$on('$ionicView.leave', function() {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
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

    // Update $scope.circles
    $scope.circles = $firebaseArray(fbUserPendingCircles);

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
                // Change Status of the circle to "true" and initializing notification badge to 0
                fbRef.child("Circles").child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
                    Status: true,
                    badgeCounter: 0
                });

                fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child($stateParams.circleID).update({
                    Status: true
                });
                $state.go('tab.requests');
            } else {
                $ionicPopup.alert({
                    title: "You haven't linked your bank account yet!",
                    template: "You can accept a request once you've linked an account. Please go to settings to link an account."
                });
            }
        });

         // Get a reference to the NewsFeed of the user
        var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");

        var feedToPush = "You accepted an invite to the social circle <b>" + $scope.circle.circleName + "</b>";

        // Append new data to this FB link
        fbNewsFeedRef.push({
            feed: feedToPush,
            icon: "ion-ios7-heart-outline"
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

         // Get a reference to the NewsFeed of the user
        var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");

        var feedToPush = "You declined an invite to the social circle <b>" + $scope.circle.circleName + "</b>";

        // Append new data to this FB link
        fbNewsFeedRef.push({
            feed: feedToPush,
            icon: "ion-heart-broken"
        });

        $state.go('tab.requests');
    }
})

// Controller for tab-settings
.controller('SettingsCtrl', function($scope, $firebaseObject, $ionicHistory, $ionicActionSheet, $cordovaCamera, $ionicNavBarDelegate, $state, $rootScope, $stateParams, $ionicLoading) {
    // Create a firebase reference
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com");
	
	var profile = $firebaseObject(fbRef.child("Users").child($rootScope.fbAuthData.uid));
	
	profile.$bindTo($scope, "data");
	
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
                        quality: 50,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 100,
                        targetHeight: 100,
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
                        // error
                        $ionicLoading.show({
                            template: 'Error choosing photo',
                            duration: 1000
                        });
                    });
                }
                if (index == 1) {
                    hideSheet();
                    var options = {
                        quality: 50,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.CAMERA,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 100,
                        targetHeight: 100,
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
                        // error
                        $ionicLoading.show({
                            template: 'Error choosing photo',
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
            if( userData.val().survey === false ){
                // Go to the survey page
                $state.go('tab.surveypage');
            }
            else{
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

    console.log("SurveyPageCtrl");

    $scope.questionList = [
        { text: "How big was your Savings Circle?", value: "Question1" },
        { text: "Which plan did you select for the Social Circle?", value: "Question2" },
        { text: "What was the amount selected for the Social Circle?", value: "Question3" },
        { text: "What did you spend the money on after you got your share?", value: "Question4" },
        { text: "If you had an option on our app to spend the money you got paid from your circle? Would you be willing to use it? Similar to the credit card cashback redeem option. ", value: "Question5" },
    ]

    $scope.answer1List = [
        { text: "1-3", value: "1-3" },
        { text: "4-6", value: "4-6" },
        { text: "7-10", value: "7-10" },
        { text: "11-15", value: "11-15" },
        { text: "15 or more", value: "15 or more" }
    ];

    $scope.answer2List = [
        { text: "Daily", value: "Daily" },
        { text: "Weekly", value: "Weekly" },
        { text: "Biweekly", value: "Biweekly" },
        { text: "Monthly", value: "Monthly" }
    ];

    $scope.answer3List = [
        { text: "1-10", value: "1-10" },
        { text: "11-19", value: "11-19" },
        { text: "20-29", value: "20-29" },
        { text: "30-59", value: "30-59" },
        { text: "60-99", value: "60-99" },
        { text: "100 or more", value: "100 or more" }
    ];

    $scope.answer4List = [
        { text: "Savings", value: "Savings" },
        { text: "Online Shopping", value: "Online Shopping" },
        { text: "Travel", value: "Travel" },
        { text: "Food", value: "Food" },
        { text: "Investments", value: "Investments" },
        { text: "Gift Cards", value: "Gift Cards" },
        { text: "Other", value: "Other" }
    ];

    $scope.answer5List = [
        { text: "Yes", value: "Yes" },
        { text: "No", value: "No" },
        { text: "May be", value: "May be" }
    ];

    $scope.question1 = {
        answer: 'ng'
    };

    $scope.question2 = $scope.question3 = $scope.question4 = $scope.question5;

    $scope.questionChosen1 = function(item) {
        $scope.question1 = {
            answer: item.value
        };
        console.log("Answer(1) to be stored:",$scope.question1.answer );
    }

    $scope.questionChosen2 = function(item) {
        $scope.question2 = {
            answer: item.value
        };
        console.log("Answer(2) to be stored:",$scope.question2.answer );
    }

    $scope.questionChosen3 = function(item) {
        $scope.question3 = {
            answer: item.value
        };
        console.log("Answer(3) to be stored:",$scope.question3.answer );
    }

    $scope.questionChosen4 = function(item) {
        $scope.question4 = {
            answer: item.value
        };
        console.log("Answer(4) to be stored:",$scope.question4.answer );
    }

    $scope.questionChosen5 = function(item) {
        $scope.question5 = {
            answer: item.value
        };
        console.log("Answer(5) to be stored:",$scope.question5.answer );
    }

    $scope.submitSurvey = function(){
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
        // Updating chat badge counter
		var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
		// Get a reference to where the User's accepted circles are going to be stored
		var fbUserAcceptedCircles = new Firebase(fbRef + "/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");
		var obj = $firebaseObject(fbUserAcceptedCircles);
	    obj.$loaded().then(function() {
	        $rootScope.walletCount = 0;
	        angular.forEach(obj, function(value, key) {
	            $rootScope.walletCount = $rootScope.walletCount + value.Members[$rootScope.fbAuthData.uid].badgeCounter;
	        });
	    });
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

// Controller for tab-Account
.controller('ConnectCtrl', function($scope, $state, $stateParams, $rootScope, $firebaseArray, $cipherFactory, $http, $ionicLoading, $ionicPopup, $ionicHistory, $ionicNavBarDelegate) {
    $scope.user = {
        type: '',
        username: '',
        password: ''
    };

    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users/" + $rootScope.fbAuthData.uid);
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

    $scope.connect = function(user) {
		$ionicLoading.show({
            template: 'Loading..Hold tight.'
        });
        fbRef.child("Payments/oauth").once('value', function(data) {
	        //Decipher oauth keys before POST
	        var oauth_key = $cipherFactory.decrypt(data.val().oauth_key.cipher_text, $rootScope.fbAuthData.uid, data.val().oauth_key.salt, data.val().oauth_key.iv);
	        console.log("oauth_key " + oauth_key);
	        
            // $http post for Bank Login
            $http.post('https://sandbox.synapsepay.com/api/v3/node/add', {
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
                console.log("Got an error in bank login.");
                console.log(err);
                alert(err.statusText);
            });
        });
    };
})

// Controller for Choose-Account
.controller('ChooseAccCtrl', function($scope, $rootScope, $state, $cipherFactory, $ionicPopup) {

    $scope.data = $rootScope.data;

    $scope.checkSelect = function(index) {
        console.log('array index is ' + index);
        $scope.temp = index;
    }
	
	$scope.check = {data:true};
	$scope.TC = function(index) {
        console.log('array index is ' + index + $scope.check.data);
        var checked = index;
    }
	
    $scope.validateUser = function() {
	    if($scope.check.data) {
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
	    }
        else {
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
	
	/*
    $scope.user = {
        day: 26,
        month: 12,
        year: 1987,
        street: "4301 rowalt dr",
        city: "College Park",
        zip: "20740",
        ssn: 3333
    };
    */
    
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
                        quality: 50,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 100,
                        targetHeight: 100,
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
                            template: 'Error choosing photo',
                            duration: 1000
                        });
                    });
                }
                
                if (index == 1) {
                    hideSheet();
                    var options = {
                        quality: 50,
                        destinationType: Camera.DestinationType.DATA_URL,
                        sourceType: Camera.PictureSourceType.CAMERA,
                        allowEdit: true,
                        encodingType: Camera.EncodingType.JPEG,
                        targetWidth: 100,
                        targetHeight: 100,
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
                            template: 'Error choosing photo',
                            duration: 1000
                        });
                    });
                }
            }
        });
    };

    $scope.validateUser = function(user) {
	    $ionicLoading.show({
            template: 'Loading..Hold tight.'
        });
        fbRef.once("value", function(data) {
	        //Decipher oauth keys before POST
	        var oauth_key = $cipherFactory.decrypt(data.val().Payments.oauth.oauth_key.cipher_text, $rootScope.fbAuthData.uid, data.val().Payments.oauth.oauth_key.salt, data.val().Payments.oauth.oauth_key.iv);
	        console.log("USER IMAGE: " + $scope.imageDoc);
            
            $http.post('https://sandbox.synapsepay.com/api/v3/user/doc/add', {
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
	            $http.post('https://sandbox.synapsepay.com/api/v3/user/doc/attachments/add', {
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
	                console.log(err);
	                console.log(JSON.stringify(err));
	                alert(err.statusText);
	            });
	            
                if (payload.data.message.en == "SSN information verified") {
	                $ionicLoading.hide();
                    $ionicPopup.alert({
                        title: "You're all set!",
                        template: "Your verification is complete"
                    });
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
	            $ionicLoading.hide();
                console.log(err);
                console.log("Attachment" + JSON.stringify(err));
                alert(err.statusText);
            });
        });
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
	        
            $http.post('https://sandbox.synapsepay.com/api/v3/user/doc/verify', {
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

                var feedToPush = "Your bank account was linked successfully!";

                // Append new data to this FB link
                fbNewsFeedRef.push({
                    feed: feedToPush,
                    icon: "ion-android-checkbox-outline"
                });
                $state.go("tab.settings");
                
            }).catch(function(err) {
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
                    alert(err.statusText);
                }
            })
        });
    };
})

// Controller for Auth-Question
.controller('QuestionCtrl', function($scope, $rootScope, $state, $cipherFactory, $http, $ionicPopup) {

    $scope.question = $rootScope.question;
    console.log("QUESTION: " + $scope.question.nodes[0].extra.mfa.message);
    $scope.authStep = function(user) {
        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);
        fbRef.child("Payments/oauth").once('value', function(data) {
	        //Decipher oauth keys before POST
	        var oauth_key = $cipherFactory.decrypt(data.val().oauth_key.cipher_text, $rootScope.fbAuthData.uid, data.val().oauth_key.salt, data.val().oauth_key.iv);
	        
            $http.post('https://sandbox.synapsepay.com/api/v3/node/verify', {
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
                } else {
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
.controller('MFACtrl', function($scope, $rootScope, $state, $cipherFactory, $http, $ionicPopup) {

    $scope.mfa = $rootScope.mfa;
    $scope.authStep = function(user) {
        var fbRef = new Firebase("https://walletbuddies.firebaseio.com/").child("Users").child($rootScope.fbAuthData.uid);
        fbRef.child("Payments/oauth").once('value', function(data) {
	        //Decipher oauth keys before POST
	        var oauth_key = $cipherFactory.decrypt(data.val().oauth_key.cipher_text, $rootScope.fbAuthData.uid, data.val().oauth_key.salt, data.val().oauth_key.iv);
	        
            $http.post('https://sandbox.synapsepay.com/api/v2/bank/mfa', {
                access_token: $scope.mfa.response.access_token,
                mfa: user.answer,
                bank: $rootScope.bank,
                oauth_consumer_key: oauth_key
            }).then(function(payload) {
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
                } else {
                    alert(err.statusText);
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

.controller('FriendsCtrl', function($scope, Friends) {
    $scope.friends = Friends.all();
})

.controller('FriendDetailCtrl', function($scope, $stateParams, Friends) {
    $scope.friend = Friends.get($stateParams.friendId);
})

.controller('HomeCtrl', function($scope, $rootScope, $firebaseArray) {
    // Get a reference to the NewsFeed of the user
    var fbNewsFeedRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");

    // Get only the last 25 feed messages
    var fbLimitedFeed = fbNewsFeedRef.orderByChild("timestamp").limitToLast(25);

    // Link to $scope to have 3-way data binding
    $scope.newsfeed = $firebaseArray(fbLimitedFeed);
    
    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users").child($rootScope.fbAuthData.uid).child("Transactions");
    // all server changes are applied in realtime
    $scope.transactions = $firebaseArray(fbRef);
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