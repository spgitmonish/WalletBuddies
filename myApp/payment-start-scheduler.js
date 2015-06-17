var Firebase = require("firebase");
var schedule = require('node-schedule');

// Get a reference to the Firebase account
var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

// Monitor the folder /StartDate for new data
fbRef.child('PaymentStart').on('child_added', function(dateSnap) {
	var date = new Date(dateSnap.val().date);
	var rule = new schedule.RecurrenceRule();
	rule.minute = date.getMinutes();
	//rule.hour = date.getHours();
	
	// Remove it now that we've processed the date
    dateSnap.ref().remove();
	
	console.log("FORMATTED DATE: " + date.getFullYear() + "-" + date.getDate() + "-" +  date.getMonth() + " / " + date.getHours() + ":" + date.getMinutes() + ":" + 			date.getSeconds());
	console.log("PLAN: " + dateSnap.val().plan);
	
	// Set day of week/month rule based on circle plan
	if (dateSnap.val().plan == "weekly") {
		//rule.dayOfWeek = date.getDay(); // Returns the day of the week (0-6) for the specified date according to local time
		rule.minute = new schedule.Range(0, 60, 1); // For testing purposes let's run the job every 2 mins for weekly plan
	}
	else if (dateSnap.val().plan == "monthly") {
		if (date.getDate() <= 28){
			//rule.dayOfMonth = date.getDate() + 1; // Returns the day of the month (1-31) for the specified date according to local time
			rule.minute = new schedule.Range(0, 60, 6);; // For testing purposes let's run the job every 6 mins for monthly plan
		}
		else
		{
			//rule.dayOfMonth = 1; // Push job date to 1st for avoiding a skip in february
			rule.minute = new schedule.Range(0, 60, 6); // For testing purposes let's run the job every 6 mins for monthly plan
		}
	}
	else {
		//rule.dayOfMonth = [1, 15]; // For biweekly plans the job runs on the 1st and 15th of every month
		rule.minute = new schedule.Range(0, 1, 15); // For testing purposes let's run the job every 1 and 15 mins for biweekly plan
	}
	console.log("CRON DATE: " + rule.minute);
	var count = 0;
	// Run the job at specified cronological date
	var j = schedule.scheduleJob(rule, function(){
	    console.log('Starting CRON');
	    // Get a reference to the Firebase account
		var path = new Firebase("https://walletbuddies.firebaseio.com/").child("Circles").child(dateSnap.val().circleID).child("Members");
	    if (count < dateSnap.val().length){
		    // Filter users based on their priority.
			path.orderByChild("Priority").equalTo(count).on('child_added', function(data){
				console.log("Payment made to Mr. " + data.key() + " with Priority " + count-1);
				
			});
			// Increment the counter
		    count++;
	    }
	    else {
		    console.log("CANCELLING CRON :(...Priority has hit " + count);
		    j.cancel();
	    }
	    
	}.bind(null, dateSnap, count));
});
