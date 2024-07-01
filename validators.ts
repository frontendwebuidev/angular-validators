import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function phoneNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {

        if (control.value?.length === 0) {
            return null;
        }

        // else if(control.value.length < 4) {
        //     return minLength: true
        // } else if(control.value.length > 16) {
        //     return maxLenth: true
        // }

      //const phoneNumberPattern = /^[0-9#*()+-]{4,16}$/
        const phoneNumberPattern = /^\d{7,8}$/;

        if (phoneNumberPattern.test(control.value)) {
            return null;
        } else {
            return { invalidPhoneNumber: true };
        }
    };
}

export function numberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const numberPattern = /^\d+$/;
        if (control.value?.length === 0) {
            return null;
        }
        if (numberPattern.test(control.value)) {
            return null;
        } else {
            return { invalidNumber: true };
        }
    };
}

export function noWhitespaceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (control.value && control.value.trim() === '') {
            return { whitespace: true };
        } else {
            return null;
        }
    };
}


export function alphabetValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const regex = /^[a-zA-Z]+(\s[a-zA-Z]+)*\s?$/;

        if (control.value?.length === 0) {
            return null;
        }

        if (!regex.test(control.value)) {
            return { 'alphabet': true };
        }
        return null;
    };
}

export function alphaNumericValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const alphaNumericPattern = /^[a-zA-Z0-9][a-zA-Z0-9\s]*$/;
        if (control.value?.length === 0) {
            return null;
        }
        if (alphaNumericPattern.test(control.value)) {
            return null;
        } else {
            return { invalidAlphaNumeric: true };
        }
    };
}


export function alphabetsAndSpecialCharsValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const pattern = /^[a-zA-Z][a-zA-Z\s!@#$%^&*(),.?":{}|<>+-]*$/

        if (control.value?.length === 0) {
            return null;
        }

        if (pattern.test(control.value)) {
            return null;
        } else {
            return { invalidChars: true };
        }
    };
}

export function passwordValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const hasUppercase = /[A-Z]/.test(control.value);
        const hasLowercase = /[a-z]/.test(control.value);
        const hasSpecialCharacter = /[!@#$%^&*(),.?":{}|<>]/.test(control.value);
        const hasNumeric = /\d/.test(control.value);

        const isValid = hasUppercase && hasLowercase && hasSpecialCharacter && hasNumeric;

        return isValid ? null : { 'invalidPassword': true };
    }
}

export function customEmailValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    // Define the custom email pattern using a regular expression
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    const isValid = emailPattern.test(control.value);
    return isValid ? null : { 'invalidEmail': { value: control.value } };
  };
}

export function fileTypeValidator(allowedTypes: string[]) {
  return (control:any) => {
    const file = control.value;
    if (file) {
      const extension = file.name.split('.')[1].toLowerCase();
      if (allowedTypes.indexOf(extension) === -1) {
        return {
          invalidFileType: true
        };
      }
    }
    return null;
  };
}


export function ninValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const ninRegex = /^[A-Za-z]\d{12}[A-Za-z\d]$/;
    const nin = control.value;

    if (nin && nin.length === 14) {
      if (nin.match(ninRegex)) {
        return null; // NIN is valid
      } else {
        return { invalidNIN: true }; // NIN is invalid
      }
    } else {
      return { invalidLength: true }; // NIN length is not 14
    }
  };
}
