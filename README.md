# Vonage Campus Workshop - Building a voice-enabled website using the Nexmo Client SDK


## Setup and Installation

Note: These instructions use `npm`, but you can use `yarn` instead of `npm run`, if you prefer `yarn`.

Install dependencies

```
npm install
```

## Run the app

The models are pre-trained, so you can use the following command to run the demo app.

```
npm run workshop-app
node server.js
```


## Build the app



## Preparing training data

The training data is all pre-run, but if you want to re-train the model or use different intents, there are four npm/yarn scripts listed in package.json for preparing the training data. Each writes out one of more new files.

The two scripts needed to train the intent classifier are:

1. `npm run raw-to-csv`: Converts the raw data into a csv format
2. `npm run csv-to-tensors`: Converts the strings in the CSV created in step 1 into tensors.

The two scripts needed to train the token tagger are:

1. `npm run raw-to-tagged-tokens`: Extracts tokens from sentences in the original data and tags each token with a category
2. `npm run tokens-to-embeddings`: embeds the tokens from the queries using the universal sentence encoder and writes out a look-up-table.

You can run all four of these commands with

```
npm run prep-data
```

You only need to do this once. This process can take 2-5 minutes on the smaller data sets and up to an hour on the full data set. The output of these scripts will be written to the `training/data` folder.

## Train the models

If you need to re-train the intent classifier model run:

```
npm run train-intent
```

To train the token tagging model run:

```
npm run train-tagger
```

Each of these scripts take multiple options, look at `training/train-intent.js` and `training/train-tagger.js` for details.

These scripts will output model artifacts in the `training/models` folder.

You can run all two of these commands with

```
npm run train
```
