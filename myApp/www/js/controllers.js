angular.module('starter.controllers', [])

// Controller for Launch page
.controller('LaunchCtrl', function($scope, $state, $rootScope, $http, $ionicHistory, fbCallback, $ionicLoading) {
    $scope.$on('$ionicView.beforeEnter', function() {
        var ref = firebase.auth();
        var authData = ref.onAuthStateChanged;

		ref.onAuthStateChanged(function(authData) {
		    //$ionicHistory.clearCache();
            //$ionicHistory.clearHistory();
            console.log("Not authenticated", authData);
		    if (authData) {
			    console.log("$rootScope.userSignUpOngoing", $rootScope.userSignUpOngoing)
			    if($rootScope.userSignUpOngoing !== true) {
					console.log("Authenticated user with uid: ", authData.uid);
				
		            // Saving auth data to be used across controllers
		            $rootScope.fbAuthData = authData;
	
		            // Switch to the Wallet Tab
		            $state.go('tab.wallet');   
			    }
		    }
		});
    });
})

// Controller for Account Creation and Sign Up
.controller('AccountCtrl', function($scope, $ionicHistory, $firebaseObject, $ionicPopup, $state, $ionicLoading, $rootScope, $log, $firebaseAuth, $http, $cordovaPushV5, $cipherFactory, $cordovaDevice) {

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
      if ($scope.check.data) {
         // Make sure all the fields have a value
         if (!account.email || !account.password || !account.firstname || !account.lastname || !account.phonenumber) {
            if (typeof analytics !== 'undefined') {
               analytics.trackEvent('Sign up Fields', 'Not Entered', 'In AccountCtrl', 1);
            }
         } else {
            console.log("All fields entered");
			
			// Create user's unique Hash.
            // Use a secret string and set the id length to be 4
            var hashids = new Hashids("SecretMonkey", 4);
            // Use the user's phone number
            // Converting string to integer
            var temp = parseInt(account.phonenumber);
            account.phonenumber = temp;
            console.log("Phone:   " + account.phonenumber);
            var id = hashids.encode(account.phonenumber);
            console.log("ID after encode: " + id);
			
            // Validating if phone number has 10 digits
            if (account.phonenumber.toString().length !== 10) {

               $ionicPopup.alert({
                  title: "Invalid",
                  template: "Please enter a valid 10 digit phone number."
               });
               return;
            }
			console.log("Checking if user is registere")
			//Check if user is already registered
            firebase.database().ref("/RegisteredUsers/").child(id).once('value', function(user) {
	            console.log("Checking if user is registered", user.exists())
	            if(user.exists()) {
		            $ionicPopup.alert({
	                  title: "User Already Registered",
	                  template: "This phone number is already linked to an existing account. Please Signin or use another number."
	                });
	                return;
	            } else {
		            // Create the User
		            firebase.auth().createUserWithEmailAndPassword(account.email, account.password)
		            .then(function(){
			           $rootScope.userSignUpOngoing = true
		               // Authorize the user with email/password
		              firebase.auth().signInWithEmailAndPassword(account.email, account.password)
		              .then(function(authData) {
		                  if(authData) {
		
		                     // Store information for easier access across controllers
		                     $rootScope.fbAuthData = authData;
		                     $rootScope.email = account.email;
		
		                     console.log("Logged in as: " + authData.uid);
		
		                     var fbRef = firebase.database().ref();
		
		                     // Get the Firebase link for this user
		                     var fbUser = fbRef.child("Users").child(authData.uid);
		                     console.log("Link: " + fbUser);
		                     
		                     $ionicLoading.show({
	                            template: 'Creating your account...',
	                            duration: 3000
	                          });
							 
		                     // Store the user information
		                     fbUser.update({
		                        firstname: account.firstname,
		                        lastname: account.lastname,
		                        email: account.email,
		                        phonenumber: account.phonenumber,
		                        survey: false
		                     });
		
		                     // Write the user's unique hash to registered users and save his UID
		                     var fbHashRef = firebase.database().ref("/RegisteredUsers/");
		                     fbHashRef.child(id).update({
		                        uid: authData.uid
		                     });
		
		                     // Check to see if user has invites
		                     var fbInvites = firebase.database().ref("/Invites/" + id);
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
		
		                     // Clear the form
		                     account.firstname = '';
		                     account.lastname = '';
		                     account.email = '';
		                     account.phonenumber = '';
		                     account.password = '';
		
		                     var dt = Date.now();
		                     // Get a reference to the NewsFeed of the user
		                     var fbNewsFeedRef = firebase.database().ref("/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
		
		                     fbRef.child("Users").child($rootScope.fbAuthData.uid).child('Badges').update({
		                        walletCounter: 0,
		                        requestCounter: 0,
		                        feedCounter: 1
		                     });
		
		                     // Record entry into Account Controller
		                     if (typeof analytics !== 'undefined') {
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
			                    console.log("Registering device for push notification", ionic.Platform.isIOS())
		                        // Register device for push notifications
		                        if (ionic.Platform.isAndroid()) {
		                            androidConfig = {
						                "senderID": "456019050509" // Project number from GCM
						            };
						            // initialize
									$cordovaPushV5.initialize(androidConfig).then(function() {
									    // start listening for new notifications
									    $cordovaPushV5.onNotification();
									    // start listening for errors
									    $cordovaPushV5.onError();
									    
									    // register to get registrationId
									    $cordovaPushV5.register().then(function(deviceToken) {
									      // `data.registrationId` save it somewhere;
									      console.log("Registration success app.js", deviceToken);
									      fbUser.update({
		                                    deviceToken: deviceToken,
		                                    device: "Android"
		                                  });
									    })
									});
		                        } else if (ionic.Platform.isIOS()) {
		                            var iosConfig = {
						                "badge": true,
						                "sound": true,
						                "alert": true,
						            };
						            
						            // initialize
									$cordovaPushV5.initialize(iosConfig).then(function() {
									    // start listening for new notifications
									    $cordovaPushV5.onNotification();
									    // start listening for errors
									    $cordovaPushV5.onError();
									    
									    // register to get registrationId
									    $cordovaPushV5.register().then(function(deviceToken) {
									      // `data.registrationId` save it somewhere;
									      console.log("Registration success app.js", deviceToken);
									      fbUser.update({
		                                    deviceToken: deviceToken,
		                                    device: "iOS"
		                                  });
									    })
									});
		                        }
		                    });
		                  } else {
		                     if (typeof analytics !== 'undefined') {
		                        analytics.trackEvent('Authentication', 'Failed', 'In AccountCtrl', error);
		                     }
		                     console.error("Authentication failed: " + error);
		                     $state.go("app.account");
		                  }
		               })
		               .catch(function(error){
			               console.log("Signin error after account creation.", error)
		               })
		            })
		            .catch(function(error){
			            console.log("Error Creating User", error)
		               switch (error.code) {
		                  case "EMAIL_TAKEN":
		                     if (typeof analytics !== 'undefined') {
		                        analytics.trackEvent('Email', 'In Use', 'In AccountCtrl', error.code);
		                     }
		                     alert("The new user account cannot be created because the email is already in use.");
		                     $ionicPopup.alert({
		                        title: "Email Taken",
		                        template: "A new account cannot be created because the email is already in use."
		                     });
		                     break;
		                  case "INVALID_EMAIL":
		                     if (typeof analytics !== 'undefined') {
		                        analytics.trackEvent('Email', 'Invalid', 'In AccountCtrl', error.code);
		                     }
		                     $ionicPopup.alert({
		                        title: "Invalid Email",
		                        template: "Please enter a valid email."
		                     });
		                     break;
		                  default:
		                     if (typeof analytics !== 'undefined') {
		                        analytics.trackEvent('Account Creation', 'Error', 'In AccountCtrl', error.code);
		                     }
		                     $ionicPopup.alert({
		                        title: "Error Signing Up",
		                        template: error.message
		                     });
		                  }
		            });
	            }
            })
            .catch(function(error){
	            console.log("FB Reg Error", error)
            })
         }
      } else {
         // User didn't accept the terms
         if (typeof analytics !== 'undefined') {
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
    var fbRef = firebase.auth();

    $scope.sendTempPassword = function() {
        fbRef.sendPasswordResetEmail(this.user.email)
        .then(function() {
           $ionicPopup.alert({
               title: "Temporary password sent"
           });

           // Record entry into Forgot Password Controlller
           if(typeof analytics !== 'undefined') {
               analytics.trackView("Forgot Password Controller");
               analytics.trackEvent('ForgotPassCtrl', 'Pass', 'In ForgotPassCtrl', 101);
           }

           $state.go('launch');
        })
        .catch(function(error) {
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
        });
    }
})

// Controller for Reset Password
.controller('ResetPassCtrl', function($scope, $state, $rootScope, fbCallback, $ionicPopup) {
    var fbRef = firebase.auth();

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
        var fbRef = firebase.database().ref();
		var auth = firebase.auth();

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
            console.log("forgotPassword");
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
            auth.signInWithEmailAndPassword(email, password)
            	.then(function(authData) {
                    // Saving auth data to be used across controllers
                    $rootScope.fbAuthData = authData;
                    $rootScope.email = email;
					console.log("Auth Success", authData)
                    // Hard coded to be false
                    if (false) {
                        var fbInvites = firebase.database().ref("/Invites/" + token);
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
                            var inviteKey = snapshot.key;
                            console.log("Key:" + inviteKey);
                            console.log("inviteval().inviteCode = " + inviteKey + " Val: " + inviteVal[0]);

                            //if(token == inviteKey) {//&& (decodedID == "1234567891")){
                            console.log("CircleID: " + inviteval().circleID);
                            //console.log("GroupName: " + inviteval().circleName);

                            // Copy the circle ID
                            circleIDMatched = inviteval().circleID;

                            // Get the link to the Circles of the User
                            var fbCircle = firebase.database().ref("/Circles/");

                            // Create an array which stores all the information
                            var circlesArray = [];
                            var loopCount = 0;

                            // Retrieve all the social circles under this user
                            // Note: This callback occurs repeatedly till all the "children" are parsed
                            fbCircle.on("child_added", function(snapshot) {
                                var circleVal = snapshot.val();

                                // Display the Circle which matched
                                if (circleval().circleID == circleIDMatched) {
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
                                //var fbInvite = firebase.database().ref("/Invites/" + inviteKey);
                                //fbInvite.remove();
                            });

                            // Length will always equal count, since snap.val will include every child_added event
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
                })
                .catch(function(error) {
	                if(typeof analytics !== 'undefined') {
                        analytics.trackEvent('Login Error', 'Username or password incorrect', 'In SignInCtrl', error);
                    }
                    $ionicLoading.hide();
                    console.log("Login Error", error)
                    $ionicPopup.alert({
                        title: "Login Error",
                        template: "Username or password is incorrect. Please try again."
                    });
                })
        }

        // Clear the forms
        //$scope.user.email = "";
        //$scope.user.password = "";
    }
])

// Controller for submitting social circle form
.controller('GroupCtrl', function($scope, $cordovaCamera, $ionicActionSheet, $ionicLoading, $firebaseObject, $ionicModal, ContactsService, fbCallback, $cordovaContacts, $ionicScrollDelegate, $rootScope, $state, $log, $ionicPopup, $ionicFilterBar, $stateParams) {

	var storageRef = firebase.storage().ref();
	var circlePhoto;
	
	function base64toBlob(b64Data, contentType) {
	  contentType = contentType || '';
	  sliceSize = 512;
	  var newb64 = b64Data.replace(/\s/g, "")
	  var byteCharacters = atob(newb64);
	  var byteArrays = [];

	  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
	    var slice = byteCharacters.slice(offset, offset + sliceSize);

	    var byteNumbers = new Array(slice.length);
	    for (var i = 0; i < slice.length; i++) {
	      byteNumbers[i] = slice.charCodeAt(i);
	    }

	    var byteArray = new Uint8Array(byteNumbers);

	    byteArrays.push(byteArray);
	  }

	  var blob = new Blob(byteArrays, {type: contentType});
	  return blob;
	}

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
                        circlePhoto = imageData
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
                        var circlePhoto = imageData
                        var blob = base64toBlob(imageData, "image/jpeg")
                        var uploadTask = storageRef.child('Circles/Users/'+ $rootScope.fbAuthData.uid+"/ProfilePhoto.jpg").put(blob);
                        uploadTask.on('state_changed', function(snapshot){
						  // Observe state change events such as progress, pause, and resume
						  // See below for more detail
						}, function(error) {
						  // Handle unsuccessful uploads
						  $ionicLoading.show({
                            template: 'We had trouble uploading your photo. Please try later.',
                            duration: 2000
                          });
						}, function() {
						  // Handle successful uploads on complete
						  $scope.imageUrl = uploadTask.snapshot.downloadURL;
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
            var fbRef = firebase.database().ref();

            // Get the link to the Circles of the User
            var fbCircle = firebase.database().ref("/Circles/");

            // Get the link to the user profile
            var fbProfile = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid);

            // Get the reference for the push
            var fbCirclePushRef = fbCircle.push();

            // Get the unique ID generated by push()
            var groupID = fbCirclePushRef.key;
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
                    circleType: circleType,
                    circleComplete: false,
                    circleCancelled: false,
                    requestsExpired: false
                });

                // Initialize the counter under CreditDates of the Circle
                fbCirclePushRef.child('CreditDates').child('Counter').update({
                    counter: 0
                });
                
                var blob = base64toBlob(circlePhoto, "image/jpeg")
                var uploadTask = storageRef.child('/Circles/'+ groupID +"/CirclePhoto.jpg").put(blob);
                uploadTask.on('state_changed', function(snapshot){
				  // Observe state change events such as progress, pause, and resume
				  // See below for more detail
				}, function(error) {
				  // Handle unsuccessful uploads

				}, function() {
				  // Handle successful uploads on complete
				  $scope.imageUrl = uploadTask.snapshot.downloadURL;
				    // Append new data to this FB link
	                fbCirclePushRef.update({
	                    circlePhoto: $scope.imageUrl
	                });
				});

                fbRef.child("Users").child($rootScope.fbAuthData.uid).once('value', function(userData) {
                    // Save invitor name photo
                    if (userData.val().profilePhoto == null) {
	                    fbCirclePushRef.update({
	                        invitorName: userData.val().firstname + " " + userData.val().lastname
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
                var fbAcceptedMembers = firebase.database().ref("/Circles/" + groupID + "/AcceptedMembers/" + $rootScope.fbAuthData.uid);
                var fbUser = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid);
                fbUser.once("value", function(userData) {
                    // Store the user information
                    // 'Singular': This group type has an admin
                    // 'Regular': This group doesn't have an admin(may be in the future)
                    if (circleType == 'Singular') {
                        fbAcceptedMembers.update({
                            admin: true,
                            firstName: userData.val().firstname,
                            lastName: userData.val().lastname,
                            phone: userData.val().phonenumber,
                            email: userData.val().email,
                            profilePhoto: userData.val().profilePhoto
                        });
                    } else {
                        fbAcceptedMembers.update({
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
                var date = firebase.database.ServerValue.TIMESTAMP;
                console.log("Firebase.ServerValue.TIMESTAMP @ STARTDATE" + date);
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
                        var temp = parseInt($scope.data.selectedContacts[i].phone);
                        console.log("Phones:   " + temp);
                        var id = hashids.encode(temp);
                        console.log("ID after encode: " + id);

                        // Get the link to the Registered User
                        var fbHash = firebase.database().ref("/RegisteredUsers/" + id);
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
                                var fbInvites = firebase.database().ref("/Invites/" + id);

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
                var fbNewsFeedRef = firebase.database().ref("/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
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
        var fbUser = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/Stripe/");
        fbUser.once("value", function(data) {
            // Check if user's bank account is linked and KYC verified
            if (data.child("Debits").exists() && data.child("Credits").exists()) {
                // Set the circleTypePicked to "None"
                $rootScope.circleTypePicked = "None";

                // Go to the page to select the type of circle
                $state.go('tab.socialcircle');
            } else {
                $ionicPopup.alert({
                    title: "You haven't linked your bank account yet!",
                    template: "You can start a new group once you've linked an account for both credits and debits. Please go to settings to link an account."
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
    var fbRef = firebase.database().ref();

    // Get a reference to where the User's circle IDs are stored
    var fbUserCircle = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/Circles/");

    // Get a reference to where the User's accepted circles are going to be stored
    var fbUserAcceptedCircles = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");

    // Delete all the accepted circles cached data
    // NOTE: This needs to be removed after all our users download the latest
    //       version of the app. Removal of this may show faster loading times.
    fbUserAcceptedCircles.remove();

    // Update $scope.circles
    $scope.circles = $firebaseArray(fbUserAcceptedCircles);

    // Obtain list of circle IDs with a "true" status
    // NOTE: This callback gets called on a 'child_added' event.
    fbCallback.childAdded(fbUserCircle, true, function(data) {
        var fbCircles = firebase.database().ref("/Circles/" + data.key);
		console.log("TRUE CIRCLES", data.key);
        // Obtain circle data for the accepted circles
        fbCallback.fetch(fbCircles, function(output) {
            // Get the information within the circle
            var acceptedCircleVal = output;
            console.log(acceptedCircleVal);

            // Get the reference for the push
            var fbAcceptedCirclePushRef = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/" + data.key);

            // Update the location(temporary cache)
            fbAcceptedCirclePushRef.update(acceptedCircleVal);
        });
    });

    // Obtain list of circle IDs with a "true" status
    // NOTE: This callback gets called on a 'child_removal'	event.
    fbCallback.childRemoved(fbUserCircle, true, function(data) {
        var fbCircles = firebase.database().ref("/Circles/" + data.key);

        // Obtain circle data for the pending circles
        fbCallback.fetch(fbCircles, function(output) {
            var acceptedCircleVal = output;

            // Check for the Pending Circle which went from Pending to Accepted/Rejected
            // and remove the corresponding entry in the "cache"
            fbUserAcceptedCircles.on('child_added', function(snapshot) {
                if (snapshot.val().circleName == acceptedCircleval().circleName) {
                    var fbAcceptedRemove = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/" + snapshot.key);
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
    var fbRef = firebase.database().ref();
    var fbCircles = firebase.database().ref("/Circles/" + $stateParams.circleID);

	// Create a storage reference from firebase storage service
	var storageRef = firebase.storage().ref();
	
	// Display credit and debit dates
	var fbCredits = firebase.database().ref("/Circles/" + $stateParams.circleID + "/NotificationDates/");
	$scope.credit = $firebaseObject((fbCredits).limitToLast(1));
	var fbDebits = firebase.database().ref("/Circles/" + $stateParams.circleID + "/DebitDates/");
	$scope.debit = $firebaseObject((fbDebits).limitToLast(1));
	var fbMembersRef = firebase.database().ref("/Circles/" + $stateParams.circleID + "/Members/");
	$scope.fbMembers = $firebaseArray(fbMembersRef);

    var fbUserAcceptedCircles = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/" + $stateParams.circleID);
    // Get the link to the user profile
    var fbProfile = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid);
    var obj = $firebaseObject(fbCircles);
    $scope.id = $rootScope.fbAuthData.uid;

    obj.$bindTo($scope, "circle");

	console.log("$firebaseArray(fbCircles)", obj, obj.$id)
	function base64toBlob(b64Data, contentType) {
	  contentType = contentType || '';
	  sliceSize = 512;
	  var newb64 = b64Data.replace(/\s/g, "")
	  var byteCharacters = atob(newb64);
	  var byteArrays = [];

	  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
	    var slice = byteCharacters.slice(offset, offset + sliceSize);

	    var byteNumbers = new Array(slice.length);
	    for (var i = 0; i < slice.length; i++) {
	      byteNumbers[i] = slice.charCodeAt(i);
	    }

	    var byteArray = new Uint8Array(byteNumbers);

	    byteArrays.push(byteArray);
	  }

	  var blob = new Blob(byteArrays, {type: contentType});
	  return blob;
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
                        targetWidth: 400,
                        targetHeight: 400,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        var blob = base64toBlob(imageData, "image/jpeg")
                        var uploadTask = storageRef.child('Circles/' + $stateParams.circleID + "/CirclePhoto.jpg").put(blob);

                        uploadTask.on('state_changed', function(snapshot){
						  // Observe state change events such as progress, pause, and resume
						  // See below for more detail
						}, function(error) {
						  // Handle unsuccessful uploads
						  $ionicLoading.show({
                            template: 'We had trouble uploading your photo. Please try later.',
                            duration: 2000
                          });
						}, function() {
						  // Handle successful uploads on complete
						  var downloadURL = uploadTask.snapshot.downloadURL;
						  console.log("Group Profile Pic Download link", downloadURL)
						  fbCircles.update({
	                        circlePhoto: downloadURL
	                      });
	                      fbUserAcceptedCircles.update({
                            circlePhoto: downloadURL
                          });
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
                        targetWidth: 400,
                        targetHeight: 400,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        var blob = base64toBlob(imageData, "image/jpeg")
                        var uploadTask = storageRef.child('Circles/' + $stateParams.circleID + "/CirclePhoto.jpg").put(blob);
                        uploadTask.on('state_changed', function(snapshot){
						  // Observe state change events such as progress, pause, and resume
						  // See below for more detail
						}, function(error) {
						  // Handle unsuccessful uploads
						  $ionicLoading.show({
                            template: 'We had trouble uploading your photo. Please try later.',
                            duration: 2000
                          });
						}, function() {
						  // Handle successful uploads on complete
						  var downloadURL = uploadTask.snapshot.downloadURL;
						  console.log("Group Profile Pic Download link", downloadURL)
						  fbCircles.update({
	                        circlePhoto: downloadURL
	                      });
	                      fbUserAcceptedCircles.update({
                            circlePhoto: downloadURL
                          });
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
    var fbCircleAcceptedMembers = firebase.database().ref("/Circles/" + $stateParams.circleID + "/AcceptedMembers/" + $rootScope.fbAuthData.uid);
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
        } else{
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

                        fbRef.child("Users").child(key).child("Circles").child($stateParams.circleID).child("Status").once('value', function(acceptStatus){
                            console.log("Accept Status", acceptStatus.val());

                            // Show only users who have accepted the invite
                            if(acceptStatus.val() == true)
                            {
                                // Once the user data is loaded update the information
                                // Update the location(temporary cache)
                                fbCircleAcceptedMembers.update({
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
                var fbHash = firebase.database().ref("/RegisteredUsers/" + id);
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
                        var fbInvites = firebase.database().ref("/Invites/" + id);

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
        fbCircles.update({
            circleCancelled: true
        }).then(function(success){
	        $ionicPopup.alert({
                title: "Success!",
                template: "Your circle has now ended. Further transactions will not be made!"
            });
        }).catch(function(error){
	        $ionicPopup.alert({
                title: "Unable to process request",
                template: "Please try again."
            });
        });
    }

})

// Controller for chat
.controller('ChatCtrl', function($scope, $stateParams, $state, $rootScope, $ionicNavBarDelegate, $timeout, $ionicScrollDelegate, $firebaseArray, $firebaseObject, UpdateMessages) {
    var fbMessages = firebase.database().ref("/Messages/" + $stateParams.circleID);
    var fbQuery = fbMessages.limitToLast(50);
    // Create a synchronized array at the firebase reference
    $scope.messages = $firebaseArray(fbQuery);

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
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        // Updating chat badge counter
		var ref = firebase.database().ref();
		// Get a reference to where the User's accepted circles are going to be stored
		var fbUserAcceptedCircles = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/" + $stateParams.circleID + "/Members/" + $rootScope.fbAuthData.uid);
		fbUserAcceptedCircles.once("value", function(data){
			ref.child('Users').child($rootScope.fbAuthData.uid).once("value", function(userData){
				// Get the existing total notification count
				var walletCounter = userData.val().Badges.walletCounter;
                var badgeCounter = data.val().badgeCounter;

                
                console.log("badgeCounter: " + badgeCounter);

                // If badgeCounter is greater than 0(for this circle),
                // that means the messages haven't been read yet,
                // so decrement walletCounter if it is not 0 already for
                // some UNKNOWN reason
                if(badgeCounter >= 0){
                    walletCounter = walletCounter - badgeCounter;
                    console.log("walletCounter: " + walletCounter);
	                // Update the total badges counter
	                ref.child('Users').child($rootScope.fbAuthData.uid).child('Badges').update({
		                walletCounter: walletCounter
					});
                }

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
		var ref = firebase.database().ref();
		cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
		// Get a reference to where the User's accepted circles are going to be stored
		var fbUserAcceptedCircles = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/Info/");
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
        var fbRef = firebase.database().ref();
        var profile = $firebaseObject(fbRef.child("Users").child($rootScope.fbAuthData.uid));

		//UpdateMessages.update($scope.data.message, $stateParams.circleID);
		var fbRef = firebase.database().ref();
	    var d = Date.now();
	    fbRef.child("Users").child($rootScope.fbAuthData.uid).once('value', function(userData) {
	        console.log("$scope.data.message: " + message, $rootScope.fbAuthData.uid, d, userData.val().firstname);
	        fbMessages.push({
	            userId: $rootScope.fbAuthData.uid,
	            text: message,
	            time: d,
	            name: userData.val().firstname
	        });
	    });

        fbMembers = firebase.database().ref("/Circles/"+$stateParams.circleID);
        fbPush = firebase.database().ref();
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
                            message: name.val().firstname + ' @ ' + obj.circleName + ': ' + message,
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
    var fbRef = firebase.database().ref();

    // Get a reference to where the User's circle IDs are stored
    var fbUserCircle = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/Circles/");

    // Get a reference to where the User's pending circles are going to be stored
    var fbUserPendingCircles = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/PendingCircles/");

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
        console.log("Circles Id(pending added): " + data.val().Status + data.key);
        var fbCircles = firebase.database().ref("/Circles/" + data.key);
        console.log("Circles FBCircles(pending added): " + fbCircles);

        // Obtain circle data for the pending circles
        fbCallback.fetch(fbCircles, function(output) {
            var pendingCircleVal = output;

            // Update the location(temporary cache)
            fbUserPendingCircles.child(data.key).update(pendingCircleVal);
        });
    });

    // Obtain list of circle IDs with a "pending" status
    // NOTE: This callback gets called on a 'child_removal'	event.
    fbCallback.childRemoved(fbUserCircle, "pending", function(data) {
        console.log("Circles Id(pending removal): " + data.val().Status + data.key);
        var fbCircles = firebase.database().ref("/Circles/" + data.key);
        console.log("Circles FBCircles(pending removal): " + fbCircles);

        // Obtain circle data for the pending circles
        fbCallback.fetch(fbCircles, function(output) {
            var pendingCircleVal = output;

            // Check for the Pending Circle which went from Pending to Accepted/Rejected
            // and remove the corresponding entry in the "cache"
            fbUserPendingCircles.on('child_added', function(snapshot) {
                if (snapshot.val().circleName == pendingCircleVal.circleName) {
                    var fbPendingRemove = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/PendingCircles/" + snapshot.key);
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
    var fbRef = firebase.database().ref();

    var fbCircles = firebase.database().ref("/Circles/" + $stateParams.circleID);
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
        var fbUser = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid);
        fbUser.once("value", function(data) {
            // Check if user's bank account is linked and KYC info verified before the user can accept an invite
            if (data.child("Payments/Bank").exists() && data.child("Payments/KYC").exists()) {
                // Send out a push and inform users of accepted invite
                var fbCircle = firebase.database().ref("/Circles/");
                var fbPush = firebase.database().ref("/PushNotifications/");
                fbCircle.child($stateParams.circleID).once('value', function(circle) {
	                // Remove this user from the contacts list so he doesn't get reminders
					fbRef.child("Users").child($rootScope.fbAuthData.uid).once('value', function(userData) {

		                for(var i in data.val().contacts) {
		                    var val = data.val().contacts[i];
							//  Loop for removing symbols in phone numbers
				            var str = val().phone.toString();
				            var temp = str.replace(/\D/g, '');
				            console.log("temp", str, temp);
				            // Removing 1 from the phone number
				            if (temp.length > 10) {
				                var temp = temp.substring(1);
				                var temp_int = parseInt(temp);
				                var phone = temp_int;
				            } else {
					            var phone = temp;
				            }

				            // Find the right contact and delete
							if(userData.val().phonenumber == phone) {
								fbRef.child("Circles").child($stateParams.circleID).child("contacts").child(i).remove();
							}
			            };
					});
					if (circle.val().circleType == 'Singular') {

						fbRef.child("Circles").child($stateParams.circleID).child('DebitDates').once('value', function(snapshot) {
							// Check if this circle is already running
							if(snapshot.exists()) {
								// Change Status of the circle to "true" and initializing notification badge to 0
				                fbRef.child("Circles").child($stateParams.circleID).child("PendingMembers").child($rootScope.fbAuthData.uid).update({
				                    Status: true,
				                    badgeCounter: 0
				                });

								fbRef.child("Circles").child($stateParams.circleID).child("Members").child($rootScope.fbAuthData.uid).update({
				                    Status: true,
				                    badgeCounter: 0
				                });

				                fbRef.child("Users").child($rootScope.fbAuthData.uid).child("Circles").child($stateParams.circleID).update({
				                    Status: true
				                });
				            // The Circle has not yet kicked off
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
						})
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
                	fbRef.child('Messages').child($stateParams.circleID).push({
                    	name: "WalletBuddies",
                    	time: d,
                    	text: data.val().firstname + " has accepted the invite to the " + circle.val().circleName + " circle."
            		});

            		for(var uid in circle.val().AcceptedMembers) {
                        if (circle.val().AcceptedMembers.hasOwnProperty(uid)) {
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
		        var fbNewsFeedRef = firebase.database().ref("/Users/"+$rootScope.fbAuthData.uid+"/NewsFeed/");
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
                var fbAcceptedMembers = firebase.database().ref("/Circles/" + $stateParams.circleID + "/AcceptedMembers/" + $rootScope.fbAuthData.uid);
                var fbUser = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid);
                fbUser.once("value", function(userData) {

                    // Store the user information
                    // NOTE: By default when a user accepts an invite the user is
                    //       not an admin
                    fbAcceptedMembers.update({
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
	        // Remove this user from the contacts list so he doesn't get reminders
			fbRef.child("Users").child($rootScope.fbAuthData.uid).once('value', function(userData) {

                for(var i in data.val().contacts) {
                    var val = data.val().contacts[i];
					//  Loop for removing symbols in phone numbers
		            var str = val.phone.toString();
		            var temp = str.replace(/\D/g, '');
		            console.log("temp", str, temp);
		            // Removing 1 from the phone number
		            if (temp.length > 10) {
		                var temp = temp.substring(1);
		                var temp_int = parseInt(temp);
		                var phone = temp_int;
		            } else {
			            var phone = temp;
		            }

		            // Find the right contact and delete
					if(userData.val().phonenumber == phone) {
						fbRef.child("Circles").child($stateParams.circleID).child("contacts").child(i).remove();
					}
	            };

	            // Send out a push and inform users of declined invite
				var fbCircle = firebase.database().ref("/Circles/");
				var fbPush = firebase.database().ref("/PushNotifications/");
	            var d = Date.now();
				//d = d.toLocaleTimeString().replace(/:\d+ /, ' ');
	        	fbRef.child('Messages').child($stateParams.circleID).push({
	            	name: "WalletBuddies",
	            	time: d,
	            	text: userData.val().firstname + " has declined the invite to the " + data.val().circleName + " circle."
	    		});

	    		for(var uid in data.val().AcceptedMembers) {
	                if (data.val().AcceptedMembers.hasOwnProperty(uid)) {
	                    fbPush.push({
		                    uid: uid,
							message: "WalletBuddies" + ' @ ' + data.val().circleName + ': ' + userData.val().firstname + " has declined the invite to the " + data.val().circleName + " circle.",
							payload: $stateParams.circleID,
							tab: "chat"
	                	});
	                }
	        	}

			});
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
                to: $rootScope.fbAuthData.email,
                subject: "Confirmation from WalletBuddies",
                text: "This message is to confirm that you have declined to join the Circle " + data.val().circleName + ". \n\n- WalletBuddies"
            });
        });

        // Get a reference to the NewsFeed of the user
        var fbNewsFeedRef = firebase.database().ref("/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
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
    var fbRef = firebase.database().ref();

	// Get a reference to the firebase storage service, which is used to create references in your storage bucket
	var storage = firebase.storage();

	// Create a storage reference from firebase storage service
	var storageRef = storage.ref();

    var profile = $firebaseObject(fbRef.child("Users").child($rootScope.fbAuthData.uid));

	var profilePic = storageRef.child("Users").child($rootScope.fbAuthData.uid+"/ProfilePhoto.jpg");
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
                        targetWidth: 400,
                        targetHeight: 400,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        var blob = base64toBlob(imageData, "image/jpeg")
                        var uploadTask = storageRef.child('Users/' + $rootScope.fbAuthData.uid+"/ProfilePhoto.jpg").put(blob);
                        uploadTask.on('state_changed', function(snapshot){
						  // Observe state change events such as progress, pause, and resume
						  // See below for more detail
						}, function(error) {
						  // Handle unsuccessful uploads
						  $ionicLoading.show({
                            template: 'We had trouble uploading your photo. Please try later.',
                            duration: 2000
                          });
						}, function() {
						  // Handle successful uploads on complete
						  var downloadURL = uploadTask.snapshot.downloadURL;
						  console.log("Profile Pic Download link", downloadURL)
						  fbRef.child("Users").child($rootScope.fbAuthData.uid).update({
                            profilePhoto: downloadURL
                          });
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
                        targetWidth: 400,
                        targetHeight: 400,
                        popoverOptions: CameraPopoverOptions,
                        saveToPhotoAlbum: false
                    };

                    $cordovaCamera.getPicture(options).then(function(imageData) {
                        var image = document.getElementById('myImage');
                        $scope.imageSrc = "data:image/jpeg;base64," + imageData;
                        var blob = base64toBlob(imageData, "image/jpeg")
                        var uploadTask = storageRef.child('Users/' + $rootScope.fbAuthData.uid+"/ProfilePhoto.jpg").put(blob);
                        uploadTask.on('state_changed', function(snapshot){
						  // Observe state change events such as progress, pause, and resume
						  // See below for more detail
						}, function(error) {
						  // Handle unsuccessful uploads
						  $ionicLoading.show({
                            template: 'We had trouble uploading your photo. Please try later.',
                            duration: 2000
                          });
						}, function() {
						  // Handle successful uploads on complete
						  var downloadURL = uploadTask.snapshot.downloadURL;
						  console.log("Profile Pic Download link", downloadURL)
						  fbRef.child("Users").child($rootScope.fbAuthData.uid).update({
                            profilePhoto: downloadURL
                          });
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

	function base64toBlob(b64Data, contentType) {
	  contentType = contentType || '';
	  sliceSize = 512;
	  var newb64 = b64Data.replace(/\s/g, "")
	  var byteCharacters = atob(newb64);
	  var byteArrays = [];

	  for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
	    var slice = byteCharacters.slice(offset, offset + sliceSize);

	    var byteNumbers = new Array(slice.length);
	    for (var i = 0; i < slice.length; i++) {
	      byteNumbers[i] = slice.charCodeAt(i);
	    }

	    var byteArray = new Uint8Array(byteNumbers);

	    byteArrays.push(byteArray);
	  }

	  var blob = new Blob(byteArrays, {type: contentType});
	  return blob;
	}

    // Go to tab-account
    $scope.account = function() {
        $state.go("tab.account");
    };

    // Go to tab-account-credits
    $scope.accountCredit = function() {
        $state.go("tab.account-credit");
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
        var fbUserPendingCircles = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/PendingCircles/");

        // Delete all the pending circles cached data
        fbUserPendingCircles.remove();

        // Get a reference to where the User's accepted circles are going to be stored
        var fbUserAcceptedCircles = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/AcceptedCircles/");

        // Delete all the accepted circles cached data
        fbUserAcceptedCircles.remove();

        $ionicHistory.clearCache();
        $ionicHistory.clearHistory();
        firebase.auth().signOut().then(function() {
		  // Sign-out successful.
		  $state.go('launch');
		}, function(error) {
		  // An error happened.
		  $ionicLoading.show({
            template: 'We had trouble signing you out! Please try again.',
            duration: 1000
          });
		});
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
    var fbRef = firebase.database().ref();

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

        var fbUserSurveyResults = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/SurveyResults/");

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
		var fbRef = firebase.database().ref();
		// Get a reference to where the User's accepted circles are going to be stored
		var fbUser = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid);
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

	$scope.$on("$ionicView.enter", function(event, data){
	   // Fire Plaid link when view loads
	   var linkHandler = Plaid.create({
		  selectAccount: true,
		  env: 'tartan',
		  clientName: 'WalletBuddies',
		  key: 'fc5e88b3e3b80b99c42edd7c5357c5',
		  product: 'auth',
		  onLoad: function() {
		    // The Link module finished loading.
		  },
		  onSuccess: function(public_token, metadata) {
		    // The onSuccess function is called when the user has successfully
		    // authenticated and selected an account to use.
		    //
		    // When called, you will send the public_token and the selected
		    // account ID, metadata.account_id, to your backend app server.
			$ionicLoading.show({
	            template: 'Loading...'
	        });
		    $http.post('https://webhook-walletbuddies2.rhcloud.com/authenticate', {
			    public_token: public_token,
				account_id: metadata.account_id,
				user: $rootScope.fbAuthData.uid,
				email: $rootScope.fbAuthData.email, 
				type: "Debits"
		    }).then(function(response) {
			    console.log("Successful POST to webhooks server", response)
			    if(response.data === "Success") {
					$ionicLoading.hide();
				    $ionicPopup.alert({
		                title: "Success",
		                template: "Your Bank Account was successfully setup for debits."
		            });   
			    } else {
				    $ionicLoading.hide();
				    $ionicPopup.alert({
		                title: "Error",
		                template: "We had trouble linking your bank account. Please try again later."
		            });
			    }
			    $state.go("tab.settings");
		    }).catch(function(err) {
			    console.log("Error making POST to webhooks server", err)
		    })
		    console.log('Public Token: ' + public_token);
		    console.log('Customer-selected account ID: ' + metadata.account_id);
		  },
		  onExit: function() {
		    // The user exited the Link flow.
		    $state.go("tab.settings");
		  },
		});
	   linkHandler.open();
	});

/*
    var fbRef = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid);
    var fbUser = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/Payments");
    var ref = firebase.database().ref();

    // Go to manual account setup
    $scope.account = function() {
        $state.go("tab.manual-account");
    };
*/

/*
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
*/
})

// Controller for tab-account-credit
.controller('StripeConnectCtrl', function($scope, $state, $stateParams, $rootScope, $cipherFactory, $cordovaDevice, $firebaseArray, $cipherFactory, $http, $ionicLoading, $ionicPopup, $ionicHistory, $ionicNavBarDelegate) {

	$scope.$on("$ionicView.enter", function(event, data){
	   // Fire Plaid link when view loads
	   var linkHandler = Plaid.create({
		  selectAccount: true,
		  env: 'tartan',
		  clientName: 'WalletBuddies',
		  key: 'fc5e88b3e3b80b99c42edd7c5357c5',
		  product: 'auth',
		  onLoad: function() {
		    // The Link module finished loading.
		  },
		  onSuccess: function(public_token, metadata) {
		    // The onSuccess function is called when the user has successfully
		    // authenticated and selected an account to use.
		    //
		    // When called, you will send the public_token and the selected
		    // account ID, metadata.account_id, to your backend app server.
			$ionicLoading.show({
	            template: 'Loading...'
	        });
		    $http.post('https://webhook-walletbuddies2.rhcloud.com/authenticate', {
			    public_token: public_token,
				account_id: metadata.account_id,
				user: $rootScope.fbAuthData.uid,
				email: $rootScope.fbAuthData.email,
				type: "Credits"
		    }).then(function(response) {
			    console.log("Successful POST to webhooks server", response)
			    if(response.data === "Success") {
					$ionicLoading.hide();
					$state.go('tab.kyc-details');  
			    } else {
				    $ionicLoading.hide();
				    $ionicPopup.alert({
		                title: "Error",
		                template: "We had trouble linking your bank account. Please try again later."
		            });
		            $state.go('tab.settings');
			    }
			    
		    }).catch(function(err) {
			    console.log("Error making POST to webhooks server", err)
		    })
		    console.log('Public Token: ' + public_token);
		    console.log('Customer-selected account ID: ' + metadata.account_id);
		  },
		  onExit: function() {
		    // The user exited the Link flow.
		    $state.go("tab.settings");
		  },
		});
	   linkHandler.open();
	});

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

	var fbRef = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid);
    var fbUser = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + "/Payments");
    var ref = firebase.database().ref();

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
            var fbRef = firebase.database().ref().child("Users").child($rootScope.fbAuthData.uid).child("Payments").child("Bank");
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
.controller('KycCtrl', function($scope, $rootScope, $state, $ionicActionSheet, $cordovaCamera, $ionicLoading, $cipherFactory, $http, $ionicPopup, $ionicHistory) {

    $scope.data = $rootScope.data;

    var fbRef = firebase.database().ref().child("Users").child($rootScope.fbAuthData.uid);
	
	/*
$scope.$on('$ionicView.leave', function() {
		console.log("CLEARING EFFIN CACHE")
      $ionicHistory.clearCache();
    });
*/
    
    $scope.validateUser = function(user) {
        // Check if user has uploaded a image
        $ionicLoading.show({
            template: 'Loading..Hold tight.'
        });
        // get host ip address of client
		var json = 'http://ipv4.myexternalip.com/json';
		$http.get(json).then(function(result) {
			var ip = result.data.ip;
	        $http.post('https://webhook-walletbuddies2.rhcloud.com/stripe-create-connect-account', {
				user: $rootScope.fbAuthData.uid,
				dob_day: user.day,
			    dob_month: user.month,
			    dob_year: user.year,
			    address_line: user.street,
			    address_postal: user.zip,
			    address_city: user.city,
			    address_state: user.state,
			    ssn: user.ssn.toString(),
			    ip: ip
		    }).then(function(response) {
			    console.log("Successful POST to webhooks server", response)
			    // Clear the form
			    user.day = "";
			    user.month = "";
			    user.year = "";
			    user.street = "";
			    user.city = "";
			    user.state = "";
			    user.zip = "";
			    user.ssn = "";
			    if(response.data === "Success") {
					$ionicLoading.hide();
	                $ionicPopup.alert({
		                title: "Thanks! You're all set.",
		                template: "Your Bank Account can now receive credits."
		            });  
			    } else {
				    $ionicLoading.hide();
				    $ionicPopup.alert({
		                title: "Error",
		                template: "We had trouble submitting your details. Please try again later."
		            });
		            $state.go('tab.settings');
			    }
			    $state.go('tab.settings');
		    }).catch(function(err) {
			    console.log("Error making POST to webhooks server", err)
			    $ionicLoading.hide();
			    $ionicPopup.alert({
	                title: "Error",
	                template: "We had trouble submitting your details. Please try again."
	            });
		    })
	    })
	}
    
})

.controller('DocUploadCtrl', function($scope, $rootScope, $state, $ionicActionSheet, $cordovaCamera, $ionicLoading, $cipherFactory, $http, $ionicPopup) {

	var fbRef = firebase.database().ref().child("Users").child($rootScope.fbAuthData.uid);

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
                        var fbNewsFeedRef = firebase.database().ref("/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
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
        var fbRef = firebase.database().ref().child("Users").child($rootScope.fbAuthData.uid);
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
                var fbNewsFeedRef = firebase.database().ref("/Users").child($rootScope.fbAuthData.uid).child("NewsFeed");
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
        var fbRef = firebase.database().ref().child("Users").child($rootScope.fbAuthData.uid);
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
        var fbRef = firebase.database().ref().child("Users").child($rootScope.fbAuthData.uid);
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
    var badgeRef = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + '/Badges/');
    var fbNewsFeedRef = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + '/NewsFeed/');
	$scope.$on('$ionicView.enter', function() {
		badgeRef.update({
			feedCounter: 0
		});
	});
    // Get only the last 25 feed messages
    var fbLimitedFeed = fbNewsFeedRef.orderByChild("timestamp").limitToLast(25);

    // Link to $scope to have 3-way data binding
    $scope.newsfeed = $firebaseArray(fbLimitedFeed);

    var fbRef = firebase.database().ref("/Users/" + $rootScope.fbAuthData.uid + '/Transactions/');
    // all server changes are applied in realtime
    $scope.transactions = $firebaseArray(fbRef);

    $scope.renderHTML = function(html_code) {
        return $sce.trustAsHtml(html_code);
    };
})
