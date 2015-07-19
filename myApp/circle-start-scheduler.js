var Firebase = require('firebase');
var schedule = require('node-schedule');

// Get a reference to the Firebase account
var fbRef = new Firebase("https://walletbuddies.firebaseio.com/");

// Monitor the folder /StartDate for new data
fbRef.child('StartDate').on('child_added', function(dateSnap) {
    var dateUnformatted = dateSnap.val();
    var date = new Date(dateUnformatted.date);
    console.log("FORMATTED DATE: " + date.getFullYear() + "-" + date.getDate() + "-" + date.getMonth() + " / " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds());

    // Remove it now that we've processed the date
    dateSnap.ref().remove();

    // Schedule a job at specified date (Currently set to 2 mins from circle creation)
    var mins = date.getMinutes() + 2;
    var scheduledDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), mins, date.getSeconds());
    console.log("Scheduled DATE: " + scheduledDate.getFullYear() + "-" + scheduledDate.getDate() + "-" + scheduledDate.getMonth() + " / " + scheduledDate.getHours() + ":" + scheduledDate.getMinutes() + ":" + scheduledDate.getSeconds());

    // Start the job at the scheduled date
    var job = schedule.scheduleJob(scheduledDate, function() {
        // Get a reference to the circle's path
        var path = new Firebase("https://walletbuddies.firebaseio.com/").child("Circles").child(dateUnformatted.circleID).child("Members");

        // Check for and remove user's with a "pending" status
        path.orderByChild("Status").equalTo("pending").on('child_added', function(data) {
            console.log("SERVICE: " + data.key());
            path.child(data.key()).remove();
            // Remove the circle from user's path too
            var userPath = new Firebase("https://walletbuddies.firebaseio.com/Users/").child(data.key()).child("Circles").child(dateUnformatted.circleID);
            userPath.remove();
        });

        // Check for and remove user's with a "false" status
        path.orderByChild("Status").equalTo(false).on('child_added', function(data) {
            console.log("SERVICE: " + data.key());
            path.child(data.key()).remove();
        });

        // Waiting 5 seconds to allow firebase to complete previous tasks
        setTimeout(function() {
            // Generate and assign a random priority for the remaining users
            path.once('value', function(data) {
                console.log("No of Children: " + data.numChildren());
                if (data.numChildren() < 3) {
                    // Write code to inform user and delete circle
                    console.log("Finishing up scheduler...Not enough number of users.");
                    job.cancel();
                } else {
                    // Generate unique random numbers
                    var limit = data.numChildren(),
                        lower_bound = 0,
                        upper_bound = limit - 1,
                        unique_random_numbers = [];

                    while (unique_random_numbers.length < limit) {
                        var random_number = Math.round(Math.random() * (upper_bound - lower_bound) + lower_bound);
                        if (unique_random_numbers.indexOf(random_number) == -1) {
                            // Yay! new unique random number
                            console.log(random_number);
                            unique_random_numbers.push(random_number);
                        }
                    }

                    // Assign a random priority for the remaining users
                    var count = 0;
                    data.forEach(function(childSnapshot) {
                        var key = childSnapshot.key();
                        console.log("KEYS: " + key + "Count" + count);
                        path.child(key).update({
                            Priority: unique_random_numbers[count]
                        });
                        count++;
                    });

                    console.log("Amt: " + dateUnformatted.amount);
                    // Save the timestamp & circleID to trigger the payments-start-scheduler
                    var circleStartDate = Firebase.ServerValue.TIMESTAMP;
                    fbRef.child('PaymentStart').push({
                        date: circleStartDate,
                        circleID: dateUnformatted.circleID,
                        plan: dateUnformatted.plan,
                        length: data.numChildren(),
                        amount: dateUnformatted.amount
                    });
                }
            });
        }, 5000);

    }.bind(null, dateUnformatted)); // This is done to use current data in the future
});