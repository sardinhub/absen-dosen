const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
async function test() {
  try {
    const app = initializeApp({
      apiKey: undefined,
      projectId: undefined
    });
    const db = getFirestore(app);
    await getDocs(collection(db, "test"));
  } catch(e) {
    console.error("Error getDocs:", e.message);
  }
}
test();
