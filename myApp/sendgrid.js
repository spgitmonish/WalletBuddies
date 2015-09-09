var Firebase = require("firebase");
var FirebaseTokenGenerator = require("firebase-token-generator");
var forge = require('node-forge');
var request = require('request');

var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users/" + "simplelogin:10408/");
var fbSynapse = new Firebase("https://walletbuddies.firebaseio.com/");

console.log("User Reference: " + fbRef);

// Athenticate the server by giving admin access
var tokenGenerator = new FirebaseTokenGenerator("vAn9n3WzAMnHv78E8dAoVboexbeCC3HqTm4kOGxl");
var token = tokenGenerator.createToken(
   {uid: "wbserver"}, 
   {admin: true}
);

fbRef.authWithCustomToken(token, function(error, authData) {
	
	/*
	// Encrypting oauth and refesh token keys
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
	    });*/
	});
});