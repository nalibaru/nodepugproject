// Define role levels based on roles
export function roleLevel(role) {
    let level = 3; // default level for undefined roles
    if (role === "admin") {
        level = 1;
    } else if (role === "teacher" || role === "special" || role === "vip") {
        level = 2;
    }
    return level;
}

// Check access permissions based on role, role level, and component
export function allowAccess(role, rolelevel, component) {
    let accessAllowed = false;
    if (role && rolelevel && component) {
        accessAllowed = roleMethod(role, rolelevel, component);
    }
    return accessAllowed;
}

// Check access permissions based on role, role level, and component and action
export function allowAction(role, rolelevel, component,action) {
    let accessAllowed = false;
    if (role && rolelevel && component && action) {
        accessAllowed = actionMethod(role, rolelevel, component, action);
        console.log("allowAction" + accessAllowed);
    }
    return accessAllowed;
}

// Define specific access rules
function roleMethod(role, rolelevel, component) {
    if (rolelevel === 1) {
        return true; // Admin has access to everything
    } else if (rolelevel === 2) {
        if (component === 'MockTest') {
            return role === 'teacher' || role === 'special' || role === 'vip';
        } else if (component === 'Event' || component === 'TimeTable') {
            return role === 'teacher' || role === 'special';
        }
        else if (component === 'Dashboard')
        {
            return true;  
        }
    }
    return false;
}

// Define specific access rules based on role, role level, component, and action
function actionMethod(role, rolelevel, component, action) {
    console.log(component +" , "+action);
    if (rolelevel === 1) {
        // Admin has access to everything
        return true; 
    } else if (rolelevel === 2) {
        switch (component) {
            case 'MockTest':
                // Teachers and VIPs have full access to MockTest, but others can't 'Assign'
                return (role === 'teacher' || role === 'vip') || (action !== 'Assign');

            case 'Event':
                // Teachers have full access to Events, 'special' cannot 'Assign'
                if (role === 'teacher') {
                    return true;
                }
                else {
                    return false; 
                }

            case 'TimeTable':
                // Teachers and 'special' roles have full access to TimeTable
                return (role === 'teacher' || role === 'special');

            case 'Dashboard':
                // All roles at rolelevel 2 have access to the Dashboard
                return true;

            default:
                // No access by default for unknown components
                return false;
        }
    }
    // Default deny if no conditions are met
    return false;
}

export function accessLevelforClient(role,roleLevel)
{
    let accesslevel = 3; //no access
    if (roleLevel === 1)
    {
        accesslevel = 1; //access all components
    }
    else if ((roleLevel === 2 && role === 'teacher') || (roleLevel === 3 && role === 'student'))
    {
        accesslevel = 1; // access all components
    }
    else if ((roleLevel === 3 && role === 'vvip') || (roleLevel === 2 && role === 'vip') || (roleLevel === 2 && role === 'guest'))
    {
        accesslevel = 2; //access mt alone
    }
    else if (roleLevel === 2 && role === 'special') 
    {
        accesslevel = 1; //no assign , access all components
    }
    return accesslevel;
}
