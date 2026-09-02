<?php
// ADD YOUR INFOMATION HERE
$recipient = "bonjour@simonhannabuss.co.uk";
$successPage = "contact-sent.html";

// NO NEED TO EDIT ANYTHING BELOW THIS LINE =====================//


//import form information
$contactName = $_POST['mjYh1GTUZPBIbi6VR8'];
$contactEmail = $_POST['22x057{Jc0Z72`u%r?#Bn:+a'];
$contactTel = $_POST['*g;F;87v8kbj7idgh6fv'];
$subject = $_POST['subfhcmg'];
$contactDetail = $_POST['To7Vx9*w~vvGoZ)b~UH0d4'];


$contactName=stripslashes($contactName);
$contactEmail=stripslashes($contactEmail);
$contactTel=stripslashes($contactTel);
$subject=stripslashes($subject);
$contactDetail=stripslashes($contactDetail);
$contactDetail= "Name: $contactName, Email: $contactEmail, Telephone: $contactTel, Subject: $subject, Message: $contactDetail";

/*
Simple form validation
check to see if an email and message were entered
*/
//if no message entered and no email entered print an error
if (empty($contactDetail) && empty($contactEmail)){
print "No email address and no message was entered. <br>Please include an email and a message";
}
//if no message entered send print an error
elseif (empty($contactDetail)){
print "No message was entered.<br>Please include a message.<br>";
}
//if no email entered send print an error
elseif (empty($contactEmail)){
print "No email address was entered.<br>Please include your email. <br>";
}
//if the form has both an email and a message
else {

//mail the form contents
mail( "$recipient", "$subject", "$contactDetail", "From: $contactEmail" );
header("Location: $successPage");
}

?>