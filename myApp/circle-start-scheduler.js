var Firebase = require("firebase");
var schedule = require('node-schedule');

// Get a reference to the Firebase account
var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

// Monitor the folder /StartDate for new data
fbRef.child('StartDate').on('child_added', function(dateSnap) {
	var dateUnformatted = dateSnap.val();
	var date = new Date(dateUnformatted.date);
	var month = date.getMonth() + 1;
	console.log("FORMATTED DATE: " + date.getFullYear() + "-" + date.getDate() + "-" +  month + " / " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds());
	
	// Remove it now that we've processed the date
    dateSnap.ref().remove();
	
	// Schedule a job at specified date
	var mins = date.getMinutes() + 2;
	var scheduledDate = new Date(date.getFullYear(), month, date.getDate(), date.getHours(), mins, date.getSeconds());
	//month = scheduledDate.getMonth() + 1;
	console.log("Scheduled DATE: " + scheduledDate.getFullYear() + "-" + scheduledDate.getDate() + "-" +  scheduledDate.getMonth() + " / " + scheduledDate.getHours() + ":" + scheduledDate.getMinutes() + ":" + scheduledDate.getSeconds());
	var j = schedule.scheduleJob(scheduledDate, function(){
    	console.log('SUCESSS BITCHES');
    	var time = Firebase.ServerValue.TIMESTAMP;
    	fbRef.child('SUCCESS').push({
	    	Bitches: time
    	});
	});
	console.log("THE END");
	
});