var Firebase = require("firebase");
var schedule = require('node-schedule');
var request = require('request');

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

    console.log("FORMATTED DATE: " + date.getFullYear() + "-" + date.getDate() + "-" + date.getMonth() + " / " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds());
    console.log("PLAN: " + dateSnap.val().plan);

    // Set day of week/month rule based on circle plan
    if (dateSnap.val().plan == "weekly") {
        //rule.dayOfWeek = date.getDay(); // Returns the day of the week (0-6) for the specified date according to local time
        rule.minute = new schedule.Range(0, 60, 1); // For testing purposes let's run the job every 2 mins for weekly plan
    } else if (dateSnap.val().plan == "monthly") {
        if (date.getDate() <= 28) {
            //rule.dayOfMonth = date.getDate() + 1; // Returns the day of the month (1-31) for the specified date according to local time
            rule.minute = new schedule.Range(0, 60, 6);; // For testing purposes let's run the job every 6 mins for monthly plan
        } else {
            //rule.dayOfMonth = 1; // Push job date to 1st for avoiding a skip in february
            rule.minute = new schedule.Range(0, 60, 6); // For testing purposes let's run the job every 6 mins for monthly plan
        }
    } else {
        //rule.dayOfMonth = [1, 15]; // For biweekly plans the job runs on the 1st and 15th of every month
        rule.minute = new schedule.Range(0, 1, 15); // For testing purposes let's run the job every 1 and 15 mins for biweekly plan
    }

    console.log("CRON DATE: " + JSON.stringify(rule));
    var count = 0;

    // Run the job at specified cronological date
    var job = schedule.scheduleJob(rule, function() {
        console.log('Starting CRON with priority: ' + count);
        // Get a reference to the Firebase account
        var path = new Firebase("https://walletbuddies.firebaseio.com/").child("Circles").child(dateSnap.val().circleID).child("Members");
        // Check to see if Everyone has been paid
        if (count < dateSnap.val().length) {
            // Debit all users present in this circle and credit to walletbuddies's account
            path.once('value', function(userData) {
                userData.forEach(function(childSnapshot) {
                    var key = childSnapshot.key();
                    console.log("Initiating a debit of $" + dateSnap.val().amount + " from Mr. " + key);
                    // Get a reference to the user's path
                    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users/" + key);
                    console.log("User Reference: " + fbRef);
                    fbRef.child("Payments").once('value', function(data) {
                        // Do a HTTP post request to the SynapsePay endpoint
                        var postData = {
                            'login': {
                                'oauth_key': data.val().oauth.oauth_key
                            },
                            'user': {
                                'fingerprint': 'suasusau21324redakufejfjsf'
                            },
                            'trans': {
                                //where you wish to debit funds from. This should belong to the user who's OAUTH key you have supplied in login
                                'from': {
                                    'type': data.val().Bank.type,
                                    'id': data.val().Bank.oid
                                },
                                //where you wish to send funds to
                                'to': {
                                    'type': 'ACH-US',
                                    'id': '557f7a7186c2736fb1c60c09'
                                },
                                'amount': {
                                    'amount': parseFloat(dateSnap.val().amount + ".01"),
                                    'currency': 'USD'
                                },
                                //this is all optional stuff.
                                //supp_id lets you add your own DB's ID for the transaction
                                //Note lets you attach a memo to the transaction
                                //Webhook URL lets you establish a webhook update line
                                //process on lets you supply the date when you wish to process this transaction. This is delta time, which means 1 means tomorrow, 2 means day after, and so on
                                //Finally the IP address of the transaction
                                'extra': {
                                    'supp_id': '1283764wqwsdd34wd13212',
                                    'note': 'Debited from WB user ',
                                    'webhook': '',
                                    'process_on': 0,
                                    'ip': '192.168.1.1',
                                },
                                //this lets you add a facilitator fee to the transaction, once the transaction settles, you will get a part of the transaction
                                'fees': [{
                                    'fee': parseFloat("0.01"),
                                    'note': 'Facilitator Fee',
                                    'to': {
                                        'id': '557f7a7186c2736fb1c60c09'
                                    }
                                }]
                            }
                        }

                        var url = 'https://sandbox.synapsepay.com/api/v3/trans/add'
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
                            //console.log("Response: " + JSON.stringify(res));
                            //console.log("Body: " + JSON.stringify(body));

                            // Get a reference to the circle path
                            var fbCircle = new Firebase("https://walletbuddies.firebaseio.com/Circles/");
                            fbCircle.child(dateSnap.val().circleID).once('value', function(circle) {
                                // Save the transaction details in the Transactions folder
                                fbRef.child("Transactions").push({
                                    amount: body.trans.amount.amount,
                                    date: body.trans.recent_status.date.$date,
                                    status: body.trans.recent_status.status,
                                    statusId: body.trans.recent_status.status_id,
                                    type: "Debit",
                                    circle: circle.val().circleName,
                                    plan: circle.val().plan
                                });
                            });
                        });
                    });
                });
            });

            // Wait 5 seconds to allow the debits to complete place before a credit is made.
            setTimeout(function() {
                // Filter users based on their priority.
                path.orderByChild("Priority").equalTo(count).on('child_added', function(dataPay) {
                    // Credit the pooled money to the user with the lowest priority
                    var key = dataPay.key();
                    var poolAmt = parseInt(dateSnap.val().amount) * dateSnap.val().length;
                    console.log("Initiating a credit of $" + poolAmt + " to Mr. " + dataPay.key() + "with priority" + count + " and next person to get paid will be with Priority " + count + 1);
                    // Get a reference to the user's path
                    var fbRef = new Firebase("https://walletbuddies.firebaseio.com/Users/" + key);
                    console.log("User Reference: " + fbRef);
                    fbRef.child("Payments").once('value', function(data) {
                        // Do a HTTP post request to the SynapsePay endpoint
                        var postData = {
                            'login': {
                                'oauth_key': 'HgXMJKXGhP6YPP2la1gs9FZqm8sGV3NmM8tJi1Fl'
                            },
                            'user': {
                                'fingerprint': 'suasusau21324redakufejfjsf'
                            },
                            'trans': {
                                //where you wish to debit funds from. This should belong to the user who's OAUTH key you have supplied in login
                                'from': {
                                    'type': 'ACH-US',
                                    'id': '557f7a7186c2736fb1c60c09'
                                },
                                //where you wish to send funds to
                                'to': {
                                    'type': data.val().Bank.type,
                                    'id': data.val().Bank.oid
                                },
                                'amount': {
                                    'amount': parseFloat(poolAmt.toString() + ".01"),
                                    'currency': 'USD'
                                },
                                //this is all optional stuff.
                                //supp_id lets you add your own DB's ID for the transaction
                                //Note lets you attach a memo to the transaction
                                //Webhook URL lets you establish a webhook update line
                                //process on lets you supply the date when you wish to process this transaction. This is delta time, which means 1 means tomorrow, 2 means day after, and so on
                                //Finally the IP address of the transaction
                                'extra': {
                                    'supp_id': '1283764wqwsdd34wd13212',
                                    'note': 'Debited from WB user ',
                                    'webhook': '',
                                    'process_on': 0,
                                    'ip': '192.168.1.1',
                                },
                                //this lets you add a facilitator fee to the transaction, once the transaction settles, you will get a part of the transaction
                                'fees': [{
                                    'fee': parseFloat("0.01"),
                                    'note': 'Facilitator Fee',
                                    'to': {
                                        'id': '557f7a7186c2736fb1c60c09'
                                    }
                                }]
                            }
                        }

                        var url = 'https://sandbox.synapsepay.com/api/v3/trans/add'
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
                            //console.log("Body: " + JSON.stringify(body));
                            console.log("Payment made to " + dataPay.key() + " and next person to get paid with Priority " + count);
                            // Get a reference to the circle path
                            var fbCircle = new Firebase("https://walletbuddies.firebaseio.com/Circles/");
                            fbCircle.child(dateSnap.val().circleID).once('value', function(circle) {
                                // Save the transaction details in the Transactions folder
                                fbRef.child("Transactions").push({
                                    amount: body.trans.amount.amount,
                                    date: body.trans.recent_status.date.$date,
                                    status: body.trans.recent_status.status,
                                    statusId: body.trans.recent_status.status_id,
                                    type: "Credit",
                                    circle: circle.val().circleName,
                                    plan: circle.val().plan
                                });
                            });
                        });
                    });
                    // Increment the counter
                    count++;
                });
            }, 5000);
        } else {
            console.log("CANCELLING CRON...Priority has hit " + count);
            job.cancel();
        }

    }.bind(null, dateSnap, count));
});