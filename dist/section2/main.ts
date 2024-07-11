import { initializeApp } from "firebase/app";
import { DataSnapshot, getDatabase, onChildAdded, ref as dataebaseRef, get} from "firebase/database";
import { getDownloadURL, getStorage, ref} from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCIHukYa07oKC159AJV7RGN1Z-ZMOZQA2k",
  authDomain: "check-ee399.firebaseapp.com",
  databaseURL: "https://check-ee399-default-rtdb.firebaseio.com",
  projectId: "check-ee399",
  storageBucket: "check-ee399.appspot.com",
  messagingSenderId: "616595701207",
  appId: "1:616595701207:web:ee4e998307f445b65f9f92",
  measurementId: "G-8LLFPR7BDT"
};

// Initialize app and database 
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const timeDisplay: HTMLElement | null = document.getElementById('current-time');
const sectionDisplayOne: HTMLElement | null = document.getElementById('first-section');
const sectionDisplayTwo: HTMLElement | null = document.getElementById('second-section');

function getTimestamp() {
  var timestamp = new Date();
  return timestamp.toLocaleString('en-us', {timeZone: 'America/New_York', timeZoneName: 'short'});
}

function formatTime() {
  var time = getTimestamp();
  var tmp = time.split(' ');
  var date = tmp[0];
  var dateNoForwardSlash = date.replace(/\//g, ':');

  // Date specific variables
  var specificDay = (new Date()).getDay(); // Returns a number 0-6
  // 0-6, Sunday - Saturday
  var datesArray = ["Sunday", "Monday", "Tuesday", "Wesnesday", "Thursday", "Friday", "Saturday"];
  // Assign date
  var specificDayString = datesArray[specificDay];
  return dateNoForwardSlash + " " +specificDayString;
}

function updateTime(): void {
  const currentTime: Date = new Date();
  const hours24 = currentTime.getHours();
  const hours12 = (hours24 % 12) || 12; // Convert hours to 12-hour format
  const amPm = hours24 < 12 ? 'AM' : 'PM'; // Determine AM/PM

  const hours: string = hours12.toString().padStart(2, '0');
  const minutes: string = currentTime.getMinutes().toString().padStart(2, '0');
  const timeString: string = `${hours}:${minutes} ${amPm}`;
  
  if (timeDisplay) {
    timeDisplay.textContent = timeString;
  }
}

function getMilitaryTime(): number {
  const time: Date = new Date();
  const hours: string = time.getHours().toString().padStart(2, '0');
  const minutes: string = time.getMinutes().toString().padStart(2, '0');
  const timeString: string = `${hours}${minutes}`;
  
  return parseInt(timeString);
}

function getSpecificDay(): number {
  const time: Date = new Date();
  return time.getDay();
}

function assignSection(time: number, day: number): string[] {
  var mW = false;
  var tuTh = false;

  var isTenToTwelve = false;
  var isTwelveToTwo = false;
  var isTwoToFour = false;
  var isFourToSix = false;
  var isFCTime = false;
  var testingPeriod = false;


  // Determine interval
  if (time >= 1000 && time <= 1150) { // 10:00 - 11:50
    isTenToTwelve = true;
  } else if (time >= 1200 && time <= 1350) { // 12:00 - 1:50
    isTwelveToTwo = true;
  } else if (time >= 1400 && time <= 1550) { // 2:00 - 3:50
    isTwoToFour = true;
  } else if (time >= 1600 && time <= 1750) { // 4:00 - 5:50
    isFourToSix = true;
  } else if (time >= 1630 && time <= 1820) { // 4:30 - 6:20
    isFCTime = true;
  } else {
    testingPeriod = true;
  }

  // Determine whether it's a MW or TuTh section
  // 0: Sunday - 6: Saturday
  if (day == 1 || day == 3) {
    mW = true;
  } else if (day == 2 || day == 4) {
    tuTh = true;
  }

  // Assign section based on time and day
  if (mW && isTenToTwelve) {
    return ["0301", "0302"];
  } else if (tuTh && isTenToTwelve) {
    return ["0401", "0402"];
  } else if (mW && isTwelveToTwo) {
    return ["0501", "0502"];
  } else if (tuTh && isTwelveToTwo) {
    return ["0601", "0602"];
  } else if (mW && isTwoToFour) {
    return ["0701", "0702"];
  } else if (tuTh && isTwoToFour) {
    return ["0801", "0802"];
  } else if (tuTh && isFourToSix) {
    return ["1001", "1002"];
  } else if (mW && isFCTime) {
    return ["FC01", "FC02"];
  } else if (testingPeriod) {
    return ["0000", "0001"];
  } else {
    return ["Out1", "Out2"];
  }
}

function updateSections() {
  const currentTime = getMilitaryTime();
  const currentDay = getSpecificDay();
  const sections = assignSection(currentTime, currentDay);
  
  if (sections.length == 1) {
    if (sectionDisplayOne) {
      sectionDisplayOne.textContent = sections[0];
      if (sectionDisplayTwo)  {
        sectionDisplayTwo.textContent = "No Second Section";
      }
    }
  } else if (sections.length == 2) {
    if (sectionDisplayOne && sectionDisplayTwo) {
      sectionDisplayOne.textContent = sections[0];
      sectionDisplayTwo.textContent = sections[1];
    }
  }
}

function updateToolStatus(sectionId: string, day: string) {
  const toolStatusRef = dataebaseRef(db, `orders/${sectionId}/${day}`);

  onChildAdded(toolStatusRef, (snapshot: DataSnapshot) => {
    const tableId = snapshot.key;
    console.log(tableId);
    const obj = snapshot.val();
    const missingTools = obj.missingTools;

    // Determine the status image based on missingTools
    let imageName = '';
    if (missingTools === undefined) {
      imageName = 'dots.png';
    } else if (missingTools === "No") {
      imageName = 'cross.png';
    } else if (missingTools === "Yes") {
      imageName = 'check.png';
    }

    displayImage(imageName, `${tableId}`);
  });
} 

async function displayImage(imageName: string, tableId: string) {
  try {
    const storage = getStorage(app);
    const storageRef = ref(storage, 'images/' + imageName);
    const url = await getDownloadURL(storageRef);

    const statusElement = document.getElementById(tableId);
    if (statusElement) {
      // Before adding a new image
      // Remove any image that may exist
      while (statusElement.firstChild) {
        statusElement.removeChild(statusElement.firstChild);
      }

      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Status Image';
      img.style.width = '20px';
      img.style.height = 'auto';
      statusElement.appendChild(img);
    } else {
      console.error(`Status element for ${tableId} not found.`);
    }
  } catch (error) {
    console.error('Error fetching image URL:', error);
  }
}

async function checkTableEntries(sectionId: string, day: string) {
  var start = 0;
  var end = 0;

  // 0 and 1 for testing
  // Switch back to 1 and 2 later
  if (sectionId[sectionId.length - 1] == '1') {
    start = 1;
    end = 5;
  } else if (sectionId[sectionId.length - 1] == '2') {
    start = 6;
    end = 10;
  }

  for (let i = start; i <= end; i++) {
    let tableString = 'Table' + i.toString();
    let tableRef = dataebaseRef(db, `orders/${sectionId}/${day}/${tableString}`);
  
    get(tableRef).then((snapshot) => {
      if (snapshot.exists()) {
        console.log(`${tableString} entry logged`);
      } else {
        console.log(`${tableString} entry not logged`);
        displayImage('dots.png', `${tableString}`);
      }
    }).catch((error) => {
      console.error(`Error fetching ${tableString} entry:`, error);
    });
  } 
}

updateTime();
updateSections();

const sections = assignSection(getMilitaryTime(), getSpecificDay());
const specificDay = formatTime();

updateToolStatus(sections[0], specificDay);
updateToolStatus(sections[1], specificDay);

checkTableEntries(sections[0], specificDay);
checkTableEntries(sections[1], specificDay);

// Update every 1000ms
setInterval(updateTime, 1000);
setInterval(updateSections, 1000);