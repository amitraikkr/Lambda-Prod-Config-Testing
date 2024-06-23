import express from 'express';
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const app = express();
const port = 3000;
const dynamodb = new DynamoDBClient({ region: 'us-east-2'});

app.use(express.json());

const maxRetries = 3;
const baseDelay = 100;

async function saveMetaDataToDynamoDB(metadata){
    for (let attempt = 0; attempt < maxRetries; attempt++){
        try{
            
            const params = {
                TableName: 'ImageMetadata',
                Item: {
                    'id': { S: metadata.id },
                    'filename': { S: metadata.filename },
                    'size': { N: metadata.size.toString() },
                    'timestamp': { N: metadata.timestamp },
                }
            };

            const command = new PutItemCommand(params);
            const response = await dynamodb.send(command);
            return response;
        } catch(error) {
            if(attempt < maxRetries - 1){
                const delay = baseDelay * Math.pow(2, attempt) + Math.random() * baseDelay;
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw new Error('Max retries reached');
            }

        }
    }
}

async function getMetadataFromDynamoDB(id) {
    try {
        const params = {
            TableName: 'ImageMetadata',
            Key: {
                'id': { S: id }
            }
        };
        const command = new GetItemCommand(params);
        const response = await dynamodb.send(command);
        return response.Item
    } catch (error) {
        throw new Error('Error fetching data from DynamdoDB');
    }
}

app.post('/metadata', async (req, res) => {
    const metadata = req.body;
    try {
        const result = await saveMetaDataToDynamoDB(metadata);
        res.status(200).send(result);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.post('/metadata/:id', async (req, res) => {
    const { id } = req.params;
    try{
        const item = await getMetadataFromDynamoDB(id);
        if (item) {
            res.status(200).json(item);
        } else {
            res.status(404).send({ error: 'Item not found' });
        }
    } catch(error) {
        res.status(500).send({ error: error.message});
    }
});


app.listen(post, () => {
    console.log(`Server is running on http://localhost:${post}`);
})