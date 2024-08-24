const sessionClearance = (req, res, next) => {
    delete req.session.role;    
    delete req.session.userdata;
    delete req.session.type;
    delete req.session.title;
    delete req.session.token;
    delete req.session.message;
    delete req.session.rolelevel;
    delete req.session.component;
    delete req.session.action;
    delete req.session.view;
    next(); 
};

const loginClearance = (req, res, next) => {
    delete req.session.role;    
    delete req.session.userdata;
    delete req.session.type;
    delete req.session.title;
    delete req.session.token;
    delete req.session.rolelevel;
    delete req.session.component;
    delete req.session.action;
    delete req.session.view;
    next();
}

export { sessionClearance ,loginClearance};