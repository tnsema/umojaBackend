import isEmpty from "../../config/isEmpty";
//import { checkIsAddress } from "../../helper/custommath";

export const registerValid = (req, res, next) => {
  let errors = {};
  let reqBody = req.body;
  let emailRegex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,6}))$/;

  let pwdregex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (isEmpty(reqBody.name)) {
    errors.name = "Name is required";
  }

  if (isEmpty(reqBody.email)) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(reqBody.email)) {
    errors.email = "Email is invalid";
  }

  if (isEmpty(reqBody.password)) {
    errors.password = "Password field is required";
  } else if (!pwdregex.test(reqBody.password)) {
    errors.password =
      "Your password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character";
  }

  if (isEmpty(reqBody.confirmpassword)) {
    errors.confirmpassword = "Confirm password field is required";
  } else if (reqBody.password != reqBody.confirmpassword) {
    errors.confirmpassword = "Password & Confirm password do not match";
  }

  if (isEmpty(reqBody.termsPolicy)) {
    errors.termsPolicy = "You must agree to the Terms and Conditions";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ status: false, errors: errors });
  }
  return next();
};

export const loginValid = (req, res, next) => {
  let errors = {};
  let reqBody = req.body.userData;
  let emailRegex =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,6}))$/;
  if (isEmpty(reqBody.email)) {
    errors.email = "Email is required";
  } else if (!emailRegex.test(reqBody.email)) {
    errors.email = "Email is invalid";
  }

  if (isEmpty(reqBody.password)) {
    errors.password = "Password field is required";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ status: false, errors: errors });
  }
  return next();
};

export const changePasswordValid = (req, res, next) => {
  let errors = {};
  let reqBody = req.body;
  let pwdregex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

  if (isEmpty(reqBody.oldPassword)) {
    errors.oldPassword = "Old Password is required";
  }

  if (isEmpty(reqBody.newPassword)) {
    errors.newPassword = "New Password is required";
  } else if (!pwdregex.test(reqBody.newPassword)) {
    errors.newPassword =
      "Your password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, one number, and one special character";
  }

  if (isEmpty(reqBody.confirmPassword)) {
    errors.confirmPassword = "Confirm password field is required";
  } else if (reqBody.newPassword != reqBody.confirmPassword) {
    errors.confirmPassword = "Password & Confirm password do not match";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ status: false, errors: errors });
  }
  return next();
};

export const subscribeValid = (req, res, next) => {
  let errors = {};
  let reqBody = req.body;
  console.log(reqBody, "valuu");

  if (isEmpty(reqBody.amount)) {
    errors.amount = "Amount field is required";
  } else if (isNaN(reqBody.amount)) {
    errors.amount = "Invalid Number";
  }
  if (isEmpty(reqBody.packageId)) {
    errors.packageId = "packageId is required";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ status: false, errors: errors });
  }
  return next();
};

export const transactionValid = (req, res, next) => {
  let errors = {};
  let reqBody = req.body;

  if (isEmpty(reqBody.hash)) {
    errors.hash = "TransactionHash is required";
  }
  if (isEmpty(reqBody.currency)) {
    errors.currency = "token is required";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ status: false, errors: errors });
  }
  return next();
};

export const userBalanceValid = (req, res, next) => {
  let errors = {};
  let reqBody = req.body;

  if (isEmpty(reqBody.currency)) {
    errors.currency = "token is required";
  }
  if (isEmpty(reqBody.amount)) {
    errors.amount = "Amount is required";
  } else if (isNaN(reqBody.amount)) {
    errors.amount = "Invalid amount";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ status: false, errors: errors });
  }
  return next();
};

export const withdrawValid = (req, res, next) => {
  let errors = {};
  let reqBody = req.body;

  if (isEmpty(reqBody.currency)) {
    errors.currency = "Currency is required";
  }
  if (isEmpty(reqBody.amount)) {
    errors.amount = "Amount is required";
  } else if (isNaN(reqBody.amount)) {
    errors.amount = "Invalid amount";
  }
  if (isEmpty(reqBody.address)) {
    errors.address = "Address is required";
  } else if (!checkIsAddress(reqBody.address)) {
    errors.address = "Invalid address";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ status: false, errors: errors });
  }
  return next();
};

export const accountValidate = (req, res, next) => {
  let errors = {};
  let reqBody = req.body;
  console.log(reqBody, "reqqqqqqqqqqqqqq");
  let IFSCcode = /^[A-Z]{4}0[A-Z0-9]{6}$/;

  if (isEmpty(reqBody.nickName)) {
    errors.nickName = "Nick Name field is required";
  }
  if (isEmpty(reqBody.holderName)) {
    errors.holderName = "Holder Name field is required";
  }

  if (isEmpty(reqBody.accountNo)) {
    errors.accountNo = "Account No field is required";
  } else if (isNaN(reqBody.accountNo)) {
    errors.accountNo = "Invalid Account No";
  }

  if (isEmpty(reqBody.bankName)) {
    errors.bankName = "Currency field is required";
  }

  if (isEmpty(reqBody.IFSC)) {
    errors.IFSC = "IFSC code is required";
  } else if (!IFSCcode.test(reqBody.IFSC)) {
    errors.IFSC = "Invalid IFSC code";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ status: false, errors: errors });
  }
  return next();
};

export const UpdateaccountValidate = (req, res, next) => {
  let errors = {};
  let reqBody = req.body;
  console.log(reqBody, "reqqqqqqqqqqqqqq");
  let IFSCcode = /^[A-Z]{4}0[A-Z0-9]{6}$/;

  if (isEmpty(reqBody.updatedAccount.nickName)) {
    errors.nickName = "Nick Name field is required";
  }
  if (isEmpty(reqBody.updatedAccount.holderName)) {
    errors.holderName = "Holder Name field is required";
  }

  if (isEmpty(reqBody.updatedAccount.accountNo)) {
    errors.accountNo = "Account No field is required";
  } else if (isNaN(reqBody.updatedAccount.accountNo)) {
    errors.accountNo = "Invalid Account No";
  }

  if (isEmpty(reqBody.updatedAccount.bankName)) {
    errors.bankName = "Currency field is required";
  }

  if (isEmpty(reqBody.updatedAccount.IFSC)) {
    errors.IFSC = "IFSC code is required";
  } else if (!IFSCcode.test(reqBody.updatedAccount.IFSC)) {
    errors.IFSC = "Invalid IFSC code";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ status: false, errors: errors });
  }
  return next();
};

export const fiatWithdrawValid = (req, res, next) => {
  let errors = {};
  let reqBody = req.body;

  if (isEmpty(reqBody.currency)) {
    errors.currency = "Currency is required";
  }
  if (isEmpty(reqBody.amount)) {
    errors.amount = "Amount is required";
  } else if (isNaN(reqBody.amount)) {
    errors.amount = "Invalid amount";
  }
  if (isEmpty(reqBody.accountDetails)) {
    errors.address = "accountDetails is required";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ status: false, errors: errors });
  }
  return next();
};

export const update2faValid = (req, res, next) => {
  let errors = {};
  let reqBody = req.body;

  if (isEmpty(reqBody.code)) {
    errors.code = "Required";
  } else if (isNaN(reqBody.code) || reqBody.code.length > 6) {
    // console.log('lllllllllllllllllllllllllllll')
    errors.code = "Invalid Code";
  }

  if (isEmpty(reqBody.secret)) {
    errors.secret = "Required";
  }

  if (isEmpty(reqBody.uri)) {
    errors.uri = "Required";
  }

  if (!isEmpty(errors)) {
    return res.status(400).json({ errors: errors });
  }

  return next();
};

export const transferValidate = async (req, res, next) => {
  let errors = {};
  let reqBody = req.body;

  if (isEmpty(reqBody.from)) {
    errors.from = "Please select the wallet";
  }

  if (isEmpty(reqBody.to)) {
    errors.to = "Please select the wallet";
  }

  if (isEmpty(reqBody.amount)) {
    errors.amount = "Please enter the amount";
  } else if (isNaN(reqBody.amount)) {
    errors.amount = "Invalid Amount";
  }

  if (!isEmpty(errors)) {
    return res.status(200).json({ errors: errors });
  }

  return next();
};
