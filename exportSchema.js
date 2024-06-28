const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function getSubcollections(docRef) {
  const subcollections = await docRef.listCollections();
  const subcollectionData = {};

  for (const subcollection of subcollections) {
    const subcollectionName = subcollection.id;
    subcollectionData[subcollectionName] = {};

    const subdocs = await subcollection.listDocuments();
    for (const subdoc of subdocs) {
      const subdocSnapshot = await subdoc.get();
      subcollectionData[subcollectionName][subdoc.id] = subdocSnapshot.data();

      // Recursively get subcollections of subdocuments
      const subdocSubcollections = await getSubcollections(subdoc);
      if (Object.keys(subdocSubcollections).length > 0) {
        subcollectionData[subcollectionName][subdoc.id].subcollections = subdocSubcollections;
      }
    }
  }

  return subcollectionData;
}

async function exportCollections() {
  const collections = await db.listCollections();
  const schema = {};

  for (const collection of collections) {
    const collectionName = collection.id;
    schema[collectionName] = {};

    const documents = await collection.listDocuments();
    for (const doc of documents) {
      const docSnapshot = await doc.get();
      schema[collectionName][doc.id] = docSnapshot.data();

      const subcollections = await getSubcollections(doc);
      if (Object.keys(subcollections).length > 0) {
        schema[collectionName][doc.id].subcollections = subcollections;
      }
    }
  }

  fs.writeFileSync('firestore-schema.json', JSON.stringify(schema, null, 2));
  console.log('Schema exported successfully.');
}

exportCollections().catch(console.error);
