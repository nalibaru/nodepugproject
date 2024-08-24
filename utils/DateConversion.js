export function convertTo12HourFormat(openTime, closeTime) {
    let [openHour, openMinute] = openTime.split(':');
    let [closeHour, closeMinute] = closeTime.split(':');
    openHour = parseInt(openHour);
    closeHour = parseInt(closeHour);
  
    const openPeriod = openHour >= 12 ? 'PM' : 'AM';
    const closePeriod = closeHour >= 12 ? 'PM' : 'AM';
    openHour = openHour % 12 || 12; 
    closeHour = closeHour % 12 || 12; 
  
    return `${openHour}:${openMinute} ${openPeriod} - ${closeHour}:${closeMinute} ${closePeriod}`;
}

export function formattedDate(date) {
  if (!date) return 'N/A';
  try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); 
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;
      console.log("formattedDate" + formattedDate);
      let [Day, HourMin] = formattedDate.split(' ');
      let [hrdata,mindata] = HourMin.split(':');
      const hrValue = parseInt(hrdata);
      const period = hrValue >= 12 ? 'PM' : 'AM';
      return formattedDate +" "+ period;
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
}

export function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}