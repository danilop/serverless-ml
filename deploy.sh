sam build
sam package --s3-bucket danilop-packages --output-template-file packaged.yaml
sam deploy --template-file packaged.yaml --stack-name serverless-ml --capabilities CAPABILITY_IAM
