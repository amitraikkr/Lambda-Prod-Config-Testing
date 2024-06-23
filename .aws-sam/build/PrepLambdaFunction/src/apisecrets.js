import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

class SecretManagerClass {
    constructor(secretId) {
        if (!secretId){
            throw new Error("Secret ID must be provided.")
        }
        this.secretId = secretId;
        this.client = new SecretsManagerClient ({ region: process.env.AWS_REGION || "us-east-2"});
        this.secretCache = null;
    }
    async GetSecret(){
        
        if (this.secretCache) {
            return this.secretCache;
        }
        
        try{

            const command = new GetSecretValueCommand({ secretId: this.secretId });
            const response = await this.client.send(command);
            
            if ("SecretString" in response) {
                this.secretCache = response.SecretString;
            } else {
                const buff = Buffer.from(response.SecretBinary, "base64")
                this.secretCache = buff.toString("ascii");
            }

        } catch(error) {
            console.error("Error retrieving secret:", error);
            throw error;
        }

    } 
}

export default SecretManagerClass;