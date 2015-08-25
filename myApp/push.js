var apn = require('apn');

var options = { };

var device = new apn.Device('5ed3b2035c8f591fc781104482ce03cd4f3f286c202c0b02769a85ac24c70908');
var note = new apn.Notification();
note.badge = 1;
note.contentAvailable = 1;

note.alert = {
	body : "Hello and welcome!"
};
note.device = device;

var options = {
	gateway: 'gateway.sandbox.push.apple.com',
	errorCallback: function(error){
	  console.log('push error', error);
	},
	cert: 'WalletBuddiesCertificate.pem',
	key:  'WalletBuddiesKey.pem',
	passphrase: 'walletmonkey',
	port: 2195,
	enhanced: true,
	cacheLength: 100
};

var apnsConnection = new apn.Connection(options);
console.log('push sent');
apnsConnection.sendNotification(note);