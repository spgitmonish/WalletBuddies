var Firebase = require("firebase");
var sendgrid  = require('sendgrid')("deepeshsunku", "hdG-vU7-ETH-FwS");


// Get a reference to the Firebase account
var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

// Monitor the folder /Sendgrid for new data
fbRef.child('Sendgrid').on('child_added', function(emailSnap) {
	var email = emailSnap.val();
	var payload = {
		to      : email.to,
		from    : email.from,
		subject : email.subject,
		text    : email.text
	}
	
	// Send out the email
	sendgrid.send(payload, function(err, json) {
		if (err) { console.error(err); }
		console.log(json);
	});
	
	// Remove it now that we've processed the email request
    emailSnap.ref().remove();
});