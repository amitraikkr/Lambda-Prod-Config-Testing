
const AWSXRay = require('aws-xray-sdk');

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const dbClient = AWSXRay.captureAWSv3Client(new DynamoDBClient("us-east-2"));
const ddbClient = DynamoDBDocumentClient.from(dbClient);
const snsClient = AWSXRay.captureAWSv3Client(new SNSClient("us-east-2"));


async function sendEmail(topicArn,emailMessage,emailSubject){

    const params = {
        TopicArn: topicArn,
        Message: emailMessage,
        Subject: emailSubject,
    }
    try{
        const command = new PublishCommand(params);
        const response = await snsClient.send(command);
        console.log("Message sent successfully:", response)
        return response

    } catch (error) {
        console.log("Error sending message ", error);
        throw new Error("Failed to send SNS message");
    }
}

exports.handler = async (event, context) => {
    console.log("Recieved Events: ", event);
    const tableName = process.env.TABLE_NAME;
     const topicArn = process.env.SECRET_NAME;


    if (!tableName || !topicArn){
        console.error("Environment Variables TABLE_NAME and SECRET_ID must be set");
        return {
            statusCode: 500,
            body: JSON.stringify({ message:"Configuration Error: Environment Variables TABLE_NAME and SECRET_NAME must be set"}),
        };
    }



    if(!event.body){
        console.log("Body is required in event ")
        return {
            statusCode: 400,
            body: JSON.stringify({message: "Body is required in event"}),
        };
    }

    const data = JSON.parse(event.body);

    const items = {
        email: data.email,
        fname: data.fname,
        lname: data.lname,
        address: data.address,
        phone: data.phone
    };

    const params = {
        TableName: tableName,
        Item: items,
    };

    try{
        const command =  new PutCommand(params);
        await ddbClient.send(command);
        console.log ("Data is written on DynamoDB successfully");
        
        try {
            const emailMessage = `Record of ${data.fname} ${data.lname} is saved`;
            const emailSubject = "Success: Participent Saved";

            const res = await sendEmail(topicArn,emailMessage, emailSubject);
            console.log ("SNS Response ",res);

            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Data is written to DynamoDB and notification sent successfully"}),
            };
        } catch (snsError) {
            console.error("Failed to send SNS message:", snsError);
            return {
                statusCode: 207,
                body: JSON.stringify({ message: "Data is written to DynamoDB, but failed to send notification", error: snsError.message}),
            };
        }
    
    } catch (dbError) {
        console.error("Error while writing data on DynamoDB");
        
        try{
            emailMessage = `Record of ${data.fname} ${data.lname} is not saved`;
            emailSubject = "FAILED: Participent is NOT Saved";

            const res = await sendEmail(topicArn,emailMessage, emailSubject);
            console.log ("SNS Response ",res);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Error while writing data on DynamoDB and sent notification", error: dbError.message}),
            };
        } catch (snsError){
            console.error("Failed to send SNS message:", snsError);
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Error while writing data on DynamoDB and notification is also not sent", error: snsError.message}),
            }

        }    

    }
}