var Firebase = require("firebase");
var FirebaseTokenGenerator = require("firebase-token-generator");
var forge = require('node-forge');
var request = require('request');

//var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users/" + "simplelogin:10408/");
var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");
var fbSynapse = new Firebase("https://walletbuddies.firebaseio.com/");

console.log("User Reference: " + fbRef);

// Athenticate the server by giving admin access
var tokenGenerator = new FirebaseTokenGenerator("vAn9n3WzAMnHv78E8dAoVboexbeCC3HqTm4kOGxl");
var token = tokenGenerator.createToken(
   {uid: "wbserver"}, 
   {admin: true}
);

fbRef.authWithCustomToken(token, function(error, authData) {
	
	
	
	
	/*var fbCircles = new Firebase("https://walletbuddies.firebaseio.com/").child("Circles");
    var fbPush = new Firebase("https://walletbuddies.firebaseio.com/PushNotifications/");
    fbCircles.once('value', function(circles) {
        circles.forEach(function(childCircle) {
	        console.log("CircleID", childCircle.key());
	        console.log("FIELD EXISTS?", circles.child(childCircle.key()+"/circleType").exists());
            if(circles.child(childCircle.key()+"/circleType").exists() && childCircle.val().circleType=='Singular' && childCircle.val().circleCancelled==false) {
	            console.log("Circle type detected:", childCircle.val().circleType, childCircle.val().circleCancelled);
	            var path = new Firebase("https://walletbuddies.firebaseio.com/").child("Circles").child(childCircle.key()).child("Members");
                path.once('value', function(userData) {
                    userData.forEach(function(childSnapshot) {
	                    console.log("User and User's STATUS:", childSnapshot.key(), childSnapshot.val().Status);
                    });
                });
            } else {
	            console.log("Absolutely nothing detected.");
	            var path = new Firebase("https://walletbuddies.firebaseio.com/").child("Circles").child(childCircle.key()).child("Members");
	            path.once('value', function(userData) {
                    userData.forEach(function(childSnapshot) {
	                    console.log("User and User's STATUS:", childSnapshot.key(), childSnapshot.val().Status);
                    });
                });
            }
        })
    })
	
	fbSynapse.child('SynapsePay').once('value', function(output) {
		// Decipher WalletBuddies' refresh token
        var cipher_text = output.val().refresh_token.cipher_text;
        var salt = output.val().refresh_token.salt;
        var iv = output.val().refresh_token.iv;
        var pass = forge.pkcs5.pbkdf2('csc-btr-8th-9kf', forge.util.decode64(salt), 4, 16);
        var decipher = forge.cipher.createDecipher('AES-CBC', pass);
        decipher.start({
            iv: forge.util.decode64(iv)
        });
        decipher.update(forge.util.createBuffer(forge.util.decode64(cipher_text)));
        decipher.finish();
        var refresh_token = decipher.output.toString();
		console.log('refresh_token: ' + refresh_token);
        // Signin to the user's SynapsePay account
        var postData = {
            "client": {
			    //your client ID and secret
			    "client_id": "9enbLBHe3M1UauQRZHBz",  
			    "client_secret": "kAelFBaFyZFU2DfeDLMgZ6xbrgOos6M1Xo1HcKV1"
			},
			  "login":{
			    //Instead of email and password, you can specify refresh_token of the user as well.
			    "refresh_token": refresh_token
			},
			  "user":{
			    //the id of the user profile that you wish to sign into.
			    "_id":{
			      "$oid": '55cbd79c95062932f243c822'
			},
			    "fingerprint": 'suasusau21324redakufejfjsf',
			    "ip": '73.200.137.46'
			}
        }

        var url = 'https://synapsepay.com/api/v3/user/signin'
        var options = {
            method: 'post',
            body: postData,
            json: true,
            url: url
        }
        request(options, function(err, res, response) {
            if (err) {
                console.log("Got an error in Synapse Signin");
                console.log(JSON.stringify(err));
                console.log("Synapse Signin StatusText: " + err.statusText);
            } else {
                console.log("SignIn BODY: " + JSON.stringify(response));
                // Save the oauth and refresh tokens
				var salt = forge.random.getBytesSync(128);
			    var keys = forge.pkcs5.pbkdf2('csc-btr-8th-9kf', salt, 4, 16);
			    var iv = forge.random.getBytesSync(16);
			    var cipher = forge.cipher.createCipher('AES-CBC', keys);
			    cipher.start({iv: iv});
			    cipher.update(forge.util.createBuffer(response.oauth.oauth_key));
			    cipher.finish();
			    var cipherText = forge.util.encode64(cipher.output.getBytes());
			    fbSynapse.child('SynapsePay').child('oauth_key').update({
				    cipher_text: cipherText, 
				    salt: forge.util.encode64(salt), 
				    iv: forge.util.encode64(iv)
				});
				var salt = forge.random.getBytesSync(128);
			    var keys = forge.pkcs5.pbkdf2('csc-btr-8th-9kf', salt, 4, 16);
			    var iv = forge.random.getBytesSync(16);
				var cipher = forge.cipher.createCipher('AES-CBC', keys);
			    cipher.start({iv: iv});
			    cipher.update(forge.util.createBuffer(response.oauth.refresh_token));
			    cipher.finish();
			    var cipherText = forge.util.encode64(cipher.output.getBytes());
			    fbSynapse.child('SynapsePay').child('refresh_token').update({
				    cipher_text: cipherText, 
				    salt: forge.util.encode64(salt), 
				    iv: forge.util.encode64(iv)
				});
            }
        });
    })
	
	
	// Encrypting SYNAPSEPAY oauth and refesh token keys
    var salt = forge.random.getBytesSync(128);
    var key = forge.pkcs5.pbkdf2("csc-btr-8th-9kf", salt, 4, 16);
    var iv = forge.random.getBytesSync(16);
    var cipher = forge.cipher.createCipher('AES-CBC', key);
    cipher.start({iv: iv});
    cipher.update(forge.util.createBuffer("Y272qzCLorxxaNGP3Ug7gyFxwxd1IOCiDCM6uqEM"));
    cipher.finish();
    var cipherText = forge.util.encode64(cipher.output.getBytes());
    fbSynapse.child('SynapsePay').child('refresh_token').update({
	    cipher_text: cipherText, 
	    salt: forge.util.encode64(salt), 
	    iv: forge.util.encode64(iv)
	});*/
	/*
	//fbRef.child("Payments").once('value', function(data) {
	fbSynapse.child('SynapsePay').once('value', function(data) {
		
	    var cipher_text = data.val().oauth_key.cipher_text;
	    var salt = data.val().oauth_key.salt;
	    var iv = data.val().oauth_key.iv;
	    console.log("TEXT, SALT, IV: " + cipher_text + "  " + salt + "  " + iv);
	    // Decipher user's oauth key
	    //function() {
        var key = forge.pkcs5.pbkdf2("csc-btr-8th-9kf", forge.util.decode64(salt), 4, 16);
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        decipher.start({iv: forge.util.decode64(iv)});
        decipher.update(forge.util.createBuffer(forge.util.decode64(cipher_text)));
        decipher.finish();
        var oauth_key = decipher.output.toString();
        console.log("DECIPHER OUTPUT: " + oauth_key);
        var poolAmt = parseInt("2") * 1;
        var amt = poolAmt.toFixed(2);
        console.log("AMT: " + amt);
                
	    // Do a HTTP post request to the SynapsePay endpoint
	    var postData = {
	        'login': {
	            'oauth_key': oauth_key
	        },
	        'user': {
	            'fingerprint': 'suasusau21324redakufejfjsf'
	        },
	        'trans': {
                //where you wish to debit funds from. This should belong to the user who's OAUTH key you have supplied in login
                'from': {
                    'type': 'SYNAPSE-US',
                    'id': '55cbd79c95062932f243c823' // WalletBuddies id
                },
                //where you wish to send funds to
                'to': {
                    'type': 'ACH-US',
                    'id': '55de5fcb9506295dfca64800'
                },
                'amount': {
                    'amount': poolAmt.toFixed(2),
                    'currency': 'USD'
                },
                //this is all optional stuff.
                //supp_id lets you add your own DB's ID for the transaction
                //Note lets you attach a memo to the transaction
                //Webhook URL lets you establish a webhook update line
                //process on lets you supply the date when you wish to process this transaction. This is delta time, which means 1 means tomorrow, 2 means day after, and so on
                //Finally the IP address of the transaction
                'extra': {
                    'supp_id': '5678',
                    'note': 'Credited to WB user ',
                    'webhook': '',
                    'process_on': 0,
                    'ip': '192.168.1.1',
                },
                //this lets you add a facilitator fee to the transaction, once the transaction settles, you will get a part of the transaction
                'fees': [{
                    'fee': parseFloat("0.01"),
                    'note': 'Facilitator Fee',
                    'to': {
                        'id': '55cbd79c95062932f243c823'
                    }
                }]
            }
	    }
	    
	    var url = 'https://synapsepay.com/api/v3/trans/add'
	    var options = {
	        method: 'post',
	        body: postData,
	        json: true,
	        url: url
	    }
	
	    request(options, function(err, res, body) {
	        if (err) {
	            console.log("Got an error in transaction");
	            console.log(JSON.stringify(err));
	            console.log("Error StatusText: " + err.statusText);
	        }
	        else {
		        console.log("TRANSACTION RES: " + JSON.stringify(res));
		        console.log("TRANSACTION BODY: " + JSON.stringify(body));
	        }
	    });
	    
	    /*
	    fbSynapse.child('SynapsePay').once('value', function(data) {
		    var postData = {
				"client": {
					"client_id": data.val().client_id, 
					"client_secret": data.val().client_secret
				},
				"login":{
					"email": "deepesh.sunku@walletbuddies.co",
					"password": "csc-btr-8th-9kf"
				},
				"user":{
					"_id":{
						"$oid": "55cbd79c95062932f243c822"
					},
					"fingerprint": "suasusau21324redakufejfjsf",
					"phone_number":"7204127218",
					//"validation_pin":"551372"
				}
			}
		
		    var url = 'https://synapsepay.com/api/v3/user/signin'
		    var options = {
		        method: 'post',
		        body: postData,
		        json: true,
		        url: url
		    }
		
		    request(options, function(err, res, body) {
		        if (err) {
		            console.log("Got an error in transaction");
		            console.log(JSON.stringify(err));
		            console.log("Error StatusText: " + err.statusText);
		        }
		        else {
			        console.log("TRANSACTION RES: " + JSON.stringify(res));
			        console.log("TRANSACTION BODY: " + JSON.stringify(body));
		        }
		    });
	    });
	});*/
	/*
	var circleStartDate = Firebase.ServerValue.TIMESTAMP;
    fbRef.child('PaymentStart').push({
        date: circleStartDate,
        circleID: '-JypS07OhU4jZ6JeYFTE',
        plan: 'daily',
        length: 3,
        amount: '1'
    });
	
	var date = Firebase.ServerValue.TIMESTAMP;
    fbRef.child('StartDate').push({
        date: date,
        circleID: "-JziVd9GKX6tUaE4uVL8",
        plan: "daily",
        amount: "1"
    });  
    
    var fbCircles = new Firebase("https://walletbuddies.firebaseio.com/").child("Circles");
    fbCircles.child('-JziVd9GKX6tUaE4uVL8').child('CreditDates').child('Counter').once('value', function(countData) {
        console.log("countData: " + JSON.stringify(countData.val()));
        // Store the counter value
        var count = countData.val().counter;
        console.log("countData.val().counter: "+countData.val().counter);
    });
    
    var path = new Firebase("https://walletbuddies.firebaseio.com/").child("Circles").child('-K0y6M09IH45tNi4Fgbu').child("Members");
    var count = 0;
        // Filter users based on their priority.
        var fbCircles = new Firebase("https://walletbuddies.firebaseio.com/").child("Circles");
                fbCircles.once('value', function(circles) {
                    circles.forEach(function(childCircle) {
	                    console.log("CIRCLE ID: " + childCircle.val().circleID + " AND numChildren: " + childCircle.child("Members").numChildren());
                    });
            	});
    
    
        fbCircles.once('value', function(circles) {
	        //console.log("Circle : " + JSON.stringify(circles.val()));
            circles.forEach(function(childCircle) {
	            fbCircles.child(childCircle.key()).child('DebitDates').once('value', function(chill) {
		            //var datesToParse = fbCircles.child(childCircle.key()).child('DebitDates');
		            var path = new Firebase("https://walletbuddies.firebaseio.com/").child("Circles").child(childCircle.key()).child("Members");
		            path.orderByChild("Priority").equalTo(0).on('child_added', function(dataPay) {
			            var poolAmt = parseInt(childCircle.val().amount) * dataPay.numChildren();
			            console.log("poolAmt " + poolAmt + "numChild: " + dataPay.numChildren());
		            });
		            console.log("childCircle : " + JSON.stringify(chill.val()));
		            chill.forEach(function(date){
			            console.log("date.val() " + date.val().debitDate);
		            });
		        });
	        });
	    });
	*/
});