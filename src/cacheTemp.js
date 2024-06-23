import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { promises as fs} from 'fs';
import path from 'path';

const s3 = new S3Client("us-east-2");
const BUCKET_NAME = 'your-bucket-name';
const CONFIG_FILE_KEY = 'config.json';
const LOCAL_PATH = '/tmp/config.json';

export const handler = async (event, context) => {
    try{

        if(await fileExists(LOCAL_PATH)){
            console.log('Using cached configuration file.');
            const config = JSON.stringify(await fs.readFile(LOCAL_PATH, 'utf-8'));
            return processConfig(config);
        }

        console.log('Fetching configuration file from S3');
        const params = {
            Bucket: BUCKET_NAME,
            Key: CONFIG_FILE_KEY,
        };

        const data = await s3.send(new GetObjectCommand(params));
        const config = JSON.parse(await streamToString(data.Body));
        
        await fs.writeFile(LOCAL_PATH, JSON.stringify(config));

        return processConfig(config);

    } catch(error) {
        console.error('Error fetching or processing configuration files:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Could not fetch configuration file'}),
        }
    }  
}

function processConfig(config){
    console.log('Processing configuration:', config);
    return {
        statusCode: 200,
        body: JSON.stringify({message: 'Configuration processed successfully', config}),
    };
}

async function fileExists(filePath){
    try{
        await fs.access(filePath);
        return true;
    }catch(Err) {
        return false;
    }
}

async function streamToString(stream){
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        stream.on('error',reject);
    })
}