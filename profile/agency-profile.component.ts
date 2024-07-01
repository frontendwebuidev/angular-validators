import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators, AbstractControl, ValidationErrors, FormArray } from '@angular/forms';
import { RestService } from 'src/app/services/rest.service';
import { RestHttpService } from 'src/app/services/rest-http.service';
import { Observable, BehaviorSubject, Subscription } from 'rxjs';
import jsonData from 'src/assets/json/geolocation.json';
import Swal from 'sweetalert2';
import { ModalComponent, ModalConfig } from '../../../_metronic/partials';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

// PDF STUFF
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { AuthService } from 'src/app/modules/auth/services/auth.service';
import { alphaNumericValidator, alphabetValidator, alphabetsAndSpecialCharsValidator, ninValidator, noWhitespaceValidator, numberValidator, phoneNumberValidator } from 'src/app/validators/validators';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { LoadingService } from '../../../services/loading.service';
pdfMake.vfs = pdfFonts.pdfMake.vfs;


export interface geoJson {
  districts: Districts[],
  villages: Villages[],
  countries: Countries[],
}

export interface Districts {
  id: string,
  value: string
}

export interface Villages {
  id: string,
  value: string
}

export interface Countries {
  id: string,
  value: string
}

const formControlNames = ['organization_name', 'apartment', 'streetName', 'locality', 'village', 'district', 'postalCode', 'country', 'position', 'phone_number', 'brn_number', 'applicant_name', 'national_id', 'email'];

@Component({
  selector: 'app-agency-profile',
  templateUrl: './agency-profile.component.html',
  styleUrls: ['./agency-profile.component.scss']
})
export class AgencyProfileComponent implements OnInit, OnDestroy {

  // geolocation
  districts = jsonData.Districts;
  villages = jsonData.Villages;
  countries = jsonData.Countries;

  uploadedDoc = '';
  formsCount = 3;
  currentStep$: BehaviorSubject<number> = new BehaviorSubject(2);
  documentUrl: SafeUrl='';
  @ViewChild('modal') private modalComponent: ModalComponent;
  // private fields
  private unsubscribe: Subscription[] = [];

  // public fields
  uploadFile: any = [];
  isLoading$: Observable<boolean>;
  user: any;

  registerAgency: FormGroup;
  updateProfile: FormGroup;
  documentForm: FormGroup;

  readOnlyInput: boolean;
  isEditableForm: boolean;

  subscriptionDetails: any = [];
  subscriptionForm: FormGroup;
  backendApiUrl = environment.apiUrl;
  terms = environment.terms;
  totalSubscriptionsAmount: number = 0;
  constructor(
    private sanitizer: DomSanitizer,
    private restService: RestService,
    private authService: AuthService,
    private loading: LoadingService,
    private fb: FormBuilder,
    private router: Router) {
    this.isLoading$ = this.restService.isLoading$;
    this.user = this.authService.currentUserValue;


    this.registerAgency = this.fb.group({
      organization_name: [this.user.user_details.organization_name, [Validators.required, noWhitespaceValidator()]],
      apartment: [this.user.user_details.organization_address.apartment, [noWhitespaceValidator()]],
      streetName: [this.user.user_details.organization_address.streetName, [Validators.required, noWhitespaceValidator()]],
      locality: [this.user.user_details.organization_address.locality, [Validators.required, noWhitespaceValidator()]],
      village: [this.user.user_details.organization_address.village, [Validators.required, noWhitespaceValidator()]],
      district: [this.user.user_details.organization_address.district, [Validators.required, alphabetsAndSpecialCharsValidator()]],
      postalCode: [this.user.user_details.organization_address.postalCode, [Validators.required, numberValidator(), Validators.maxLength(12), Validators.minLength(5)]],
      country: [this.user.user_details.organization_address.country, Validators.required],
      position: [this.user.user_details.position, [Validators.required, alphabetValidator()]],
      phone_number: [this.user.user_details.phone_number, [Validators.required, phoneNumberValidator()]],
      brn_number: [this.user.user_details.brn_number, [Validators.required, alphaNumericValidator(), Validators.maxLength(9), Validators.minLength(9)]],
      applicant_name: [this.user.user_details.applicant_name, [Validators.required, alphabetsAndSpecialCharsValidator()]],
      national_id: [this.user.user_details.national_id, [Validators.required, ninValidator(), alphaNumericValidator(), Validators.maxLength(14), Validators.minLength(14)]],
      email: [this.user.email, Validators.compose([Validators.required, Validators.email, Validators.minLength(3), Validators.maxLength(320)])],
      identity_card_file1: [null, Validators.compose([Validators.required, this.supportedAttachmentValidator(['jpg', 'jpeg', 'png', 'pdf'])])],
      business_registration_certificate_doc: [null, Validators.compose([Validators.required, this.supportedAttachmentValidator(['jpg', 'jpeg', 'png', 'pdf'])])],
      authorize_signatory_doc: [null, Validators.compose([Validators.required, this.supportedAttachmentValidator(['jpg', 'jpeg', 'png', 'pdf'])])],
      notarized_board_resolution_doc: [null, Validators.compose([Validators.required, this.supportedAttachmentValidator(['jpg', 'jpeg', 'png', 'pdf'])])],
      power_of_atorny_doc: [null, Validators.compose([Validators.required, this.supportedAttachmentValidator(['jpg', 'jpeg', 'png', 'pdf'])])],
      agency_dpo: [null, Validators.compose([Validators.required, this.supportedAttachmentValidator(['jpg', 'jpeg', 'png', 'pdf'])])],
    });

    this.documentForm = this.fb.group({
      terms: [false, Validators.requiredTrue],
      formPdf: [null, Validators.compose([Validators.required, this.supportedAttachmentValidator(['jpg', 'jpeg', 'png', 'pdf'])])]
    });

    this.subscriptionForm = this.fb.group({
      subscription : this.fb.array([])
    });
  }

  modalConfig: ModalConfig = {
    modalTitle: '',
    dismissButtonLabel: 'close',
    closeButtonLabel: 'Close',
    hideDismissButton: () => true,
    onClose:()=>{this.documentUrl=''}
  };

  get subscriptinControl() {
    return this.subscriptionForm.get('subscription') as FormArray;
  }

  addSubscription(){
    this.subscriptinControl.push(
      this.fb.group({
        checked : [false],
        id : [''],
        reason : [''],
        expire_at: [''],
        start_at: ['']
      })
    )
  }

  onChange(id:any,index:any){
    this.subscriptionForm.get(`subscription.${index}.id`)?.setValue(id);
    this.totalSubscriptionAmount();
  }

  subscriptionList() {
    const subscriptionSubcr = this.restService.getMethod("/agency/subscriptions")
      .subscribe((data: any) => {
        if (data.status) {
          this.subscriptionDetails = data.items;
          this.subscriptionDetails.forEach((el:any) => {
            this.addSubscription()
           });
        } else {
          // display error
        }
      })

    this.unsubscribe.push(subscriptionSubcr);
  }

  subscriptionDisable() {
    let data = this.subscriptionForm.value.subscription;
    let checked = data.filter((el: any) => el.checked);
    if (data.length > 0 && checked.length > 0) {
      let reasons = data.filter((el: any) => el.checked && el.reason);
      return checked.length !== reasons.length;
    } else return true;
  }


  // PDF GENERATION
  generatePDF(action: string) {
   let pdfContent = [];
   let sub= this.subscriptionForm.value.subscription.filter((el:any) => el.checked)

    // for (var key in this.f) {
    //   if ((key != 'identity_card_file1') && (key != 'business_registration_certificate_doc') && (key != 'authorize_signatory_doc') && (key != 'notarized_board_resolution_doc') && (key != 'power_of_atorny_doc') && (key != 'agency_dpo' && key != 'formPdf')) {
    //     pdfContent.push([key.replace(/_/gi, ' ').toUpperCase(), this.registerAgency.value[key]]);
    //   }
    // }

    // for (var key in this.uploadFile) {
    //   if (key != 'formPdf') {
    //     pdfContent.push([key.replace(/_/gi, ' ').toUpperCase(), this.uploadFile[key].name]);
    //   }
    // }

    let address = `${this.registerAgency.value['apartment']}, ${this.registerAgency.value['streetName']},  ${this.registerAgency.value['locality']},  ${this.registerAgency.value['village']},  ${this.registerAgency.value['district']}  ${this.registerAgency.value['postalCode']},  ${this.registerAgency.value['country']}`
    pdfContent.push(
      ['Organization Name', this.registerAgency.value['organization_name']],
      ['Business Registration Number', this.registerAgency.value['brn_number']],
      ['Organization Address', address],
      ['Name of the Applicant (Authorised signatory)', this.registerAgency.value['applicant_name']],
      ['Position', this.registerAgency.value['position']],
      ['National ID Number', this.registerAgency.value['national_id']],
      ['Mobile Phone', this.registerAgency.value['phone_number']],
      ['Email Address', this.registerAgency.value['email']],
    );

    if (sub) {
      pdfContent.push([' ', ' ']);
      pdfContent.push([{ text: 'SUBSCRIPTION', bold: true }, { text: 'Purpose/Reason', bold: true }]);
    }
    for (var item of sub) {
      const selectedSubscr = this.subscriptionDetails.find((el:any) => el.id == item.id).name;
      pdfContent.push([selectedSubscr, item.reason]);
    }

    //pdfContent.push(['SUBSCRIPTION', selectedSubscr ? selectedSubscr : 'Unknown']);

    let docDefinition: any = {
      content: [
        {
          text: "APPLICATION FORM FOR AUTHORIZATION FOR READING CARD DATA OR MOBILE ID DATA",
          bold: true, alignment: 'center', margin: [0, 0, 0, 20], fontSize: 16,
        },
        {
          style: 'tableExample',
          table: {
            widths: ['50%', '50%'],
            body: pdfContent
          }
        },
        // margin: [left, top, right, bottom]
        { text: 'Documents to be submitted', margin: [0, 10, 0, 5], fontSize: 14, bold: true },
        {
          ul: [
            {
              text: "Applicant's Identity Card or in the case of non-citizen, his passport [Applicant Passport for Citizen outside Mauritius without Identity Card]",
              margin: [0, 5]
            },
            {
              text: "Business Registration Certificate",
              margin: [0, 5]
            },
            {
              text: "Identity Card or Passport of authorised signatory (If the applicant is not authorised signatory)",
              margin: [0, 5]
            },
            {
              text: "A notarised Board resolution for the authorised signatory",
              margin: [0, 5]
            },
            {
              text: "Authorisation of Authorised Signatory or Power of Attorney for Applicant",
              margin: [0, 5]
            },
            {
              text: "Registration certificate for Controller",
            }
          ]
        },
        { text: 'Declaration', margin: [0, 10, 0, 5], fontSize: 14, bold: true, alignment: 'center' },
        { text: 'I declare that -' },
        {
          ul: [
            {
              text: "the particulars, information and documents submitted in connection with this application are, to the best of my knowledge, true and correct;",
              margin: [0, 5]
            },
            {
              text: "I have not wilfully concealed any material fact;",
              margin: [0, 5]
            },
            {
              text: "I am aware that in case I have produced any false document for the purpose of this application, I am liable to prosecution and my authorisation may be cancelled; and",
              margin: [0, 5]
            },
            {
              text: "I have read and agreed to the Terms of Use.",
              margin: [0, 5]
            },
          ]
        },
        { text: '\n' },
        {
          columns: [
            {
              width: '50%',
              text: 'Digital signature',
              fontSize: 12, bold: true, alignment: 'left',
            },
            {
              width: '50%',
              text: 'Date ___________________',
              fontSize: 12, bold: true, alignment: 'left'
            },
          ],
          columnGap: 180
        },
      ]
    };

    if (action === 'download') {
      pdfMake.createPdf(docDefinition).download();
    }

  }

  nextStep() {
    this.loading.show();
    const nextStep = this.currentStep$.value + 1;

    if (nextStep === this.formsCount) {
      this.uploadedDoc = ''
    }
    if (nextStep > this.formsCount) {
      return;
    }

    this.currentStep$.next(nextStep);
    this.loading.hide();
  }

  prevStep() {
    this.loading.show();
    const prevStep = this.currentStep$.value - 1;

    if (prevStep === 1) {

      // move it into separate function
      for (var key in this.uploadFile) {

        this.registerAgency.patchValue({
          key: this.uploadFile[key],
        });

        this.registerAgency.get(key)?.markAsTouched();
        this.registerAgency.get(key)?.setErrors(null);
      }
    }

    if (prevStep === 0) {
      return;
    }
    this.currentStep$.next(prevStep);
    this.loading.hide();
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.uploadedDoc = event.target.files[0].name;
      this.uploadFile['formPdf'] = event.target.files[0];
      const fileSize = event.target.files[0].size;
      if (fileSize > 5 * 1024 * 1024) {  // File Size Validation of 5 MB
        this.documentForm.get('formPdf')?.setErrors({ fileSizeExceeded: true });
      }
    }
  }

  ngOnInit(): void {
    // Default Active and inactive
    this.disableControls();
    this.isEditableForm = false;

    if (this.user?.status.title === 'Rejected') {
      this.isEditableForm = true;
    } else if (this.user?.status.title === 'Pending') {
      this.isEditableForm = false;
    } else if (this.user?.status.title === 'Active') {
      this.updateProfileForm();
    }
    this.subscriptionList();
  }

  updateProfileForm() {
    this.updateProfile = this.fb.group({

      /* ONLY ADDRESS UPDATE
       organization_name: [this.user.user_details.organization_name, Validators.required],
       position: [this.user.user_details.position, Validators.required],
       brn_number: [this.user.user_details.brn_number, Validators.required],
       applicant_name: [this.user.user_details.applicant_name, Validators.required],
       email: [this.user.email, Validators.compose([Validators.required, Validators.email, Validators.minLength(3), Validators.maxLength(320)])]
       national_id: [this.user.user_details.national_id, Validators.required],
      */

      apartment: [this.user.user_details.organization_address.apartment, [Validators.required, noWhitespaceValidator()]],
      streetName: [this.user.user_details.organization_address.streetName, [Validators.required, noWhitespaceValidator()]],
      locality: [this.user.user_details.organization_address.locality, [Validators.required, noWhitespaceValidator()]],
      village: [this.user.user_details.organization_address.village, [Validators.required, noWhitespaceValidator()]],
      district: [this.user.user_details.organization_address.district, [Validators.required, alphabetsAndSpecialCharsValidator()]],
      postalCode: [this.user.user_details.organization_address.postalCode, [Validators.required, numberValidator(), Validators.maxLength(12), Validators.minLength(5)]],
      phone_number: [this.user.user_details.phone_number, [Validators.required, phoneNumberValidator()]],
    });
  }

  updateProfileFn() {
    Swal.fire({
      title: 'Are you sure you want to update?',
      allowOutsideClick: false,
      allowEscapeKey: false,
      icon: "question",
      confirmButtonText: 'Ok',
      cancelButtonText: 'Cancel',
      showCancelButton: true,
    }).then((result) => {
      if (result.isConfirmed) {
        let endPoint: string = '/agency/update-profile';
        const updateAgencyFormscbr =
          this.restService.postMethod(endPoint, this.updateProfile.value).subscribe((res: any) => {
            if (res) {
              if (res.status) {
                // this.updateProfile.reset();
                Swal.fire({
                  title: 'Request sent successfully',
                  allowOutsideClick: false,
                  allowEscapeKey: false,
                  icon: "success",
                  confirmButtonText: 'Ok',
                }).then((result: any) => {
                  if (result.isConfirmed) this.router.navigate(['/dashboard']);
                })
                this.isEditableForm = false;
              } else {
                Swal.fire({
                  icon: "error",
                  allowOutsideClick: false,
                  allowEscapeKey: false,
                  title: 'Oops..',
                  text: res.message,
                })

              }
            }
          });
        this.unsubscribe.push(updateAgencyFormscbr);
      } else {
        return
      }
    })
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }


  get f() {
    return this.registerAgency.controls;
  }

  findSubscriptionId(array: any) {
    if (array.includes(1) && array.includes(2) && array.includes(3)) return 7;
    else if (array.includes(1) && array.includes(2)) return 6;
    else if (array.includes(2) && array.includes(3)) return 5;
    else if (array.includes(1) && array.includes(3)) return 4;
    else return array[0];
  }

  submit() {
    let formData = new FormData();

    for (var key in this.uploadFile) {
      formData.append(key, this.uploadFile[key]);
    }

    for (var key in this.f) {
      if (!formData.has(key)) {
        formData.append(key, this.registerAgency.value[key]);
      }
    }

    if (!this.documentForm.value['terms']) {
      Swal.fire({
        title: 'Agree terms to proceed',
        allowOutsideClick: false,
        allowEscapeKey: false,
        icon: "warning"
      })
      return;
    }
    let subscription = this.subscriptionForm.value.subscription.filter((el:any) => el.checked);
    let subscriptionObj:any = {subscription_reason: {}};
    for (let index = 0; index < subscription.length; index++) {
      Object.assign(subscriptionObj.subscription_reason, [...this.subscriptionForm.value.subscription])
    }
    subscriptionObj.id = this.findSubscriptionId(subscription.map((el:any) => el.id));
    formData.append("subscriptionId",JSON.stringify(subscriptionObj) );
    let endPoint: string = '/agency/update-profile';
    const registerAgencyFormscbr =
      this.restService.addRegisterAgencyForm(formData, endPoint)
        .subscribe((res: any) => {
          if (res) {
            if (res.status) {
              const meSuubscr = this.authService.getUserByToken().subscribe((data: any) => {
                this.user = data;
              });

              this.unsubscribe.push(meSuubscr);

              Swal.fire({
                title: 'Request Successfull',
                allowOutsideClick: false,
                allowEscapeKey: false,
                icon: "success",
                confirmButtonText: 'Ok',
              }).then((result: any) => {
                if (result.isConfirmed) {
                  this.registerAgency.reset();
                  this.uploadFile = [];
                  // this.currentStep$.next(1);
                  this.router.navigate(['/dashboard'])
                }
              })
            } else {
              Swal.fire({
                icon: "error",
                allowOutsideClick: false,
                allowEscapeKey: false,
                title: 'Oops..',
                text: res.message,
              })
            }
          }
        });

    this.unsubscribe.push(registerAgencyFormscbr);
  }

  disableControls() {
    this.registerAgency.disable();
    this.readOnlyInput = true;
    // this.controlClass = 'text-muted fw-bold border-0';

    for (const controlName of formControlNames) {
      this.registerAgency.get(controlName)?.disable();
    }
  }

  enableControls() {
    this.registerAgency.enable();
    this.readOnlyInput = false;
    // this.controlClass = 'text-muted fw-bold border-0 border-bottom-2';

    for (const controlName of formControlNames) {
      this.registerAgency.get(controlName)?.enable();
    }
  }

  onFileChange(event: any) {
    let attachmentName = event.currentTarget.attributes.formControlName.nodeValue;

    if (event.target.files.length > 0) {
      let file = event.target.files[0];
      this.uploadFile[attachmentName] = file;

      if (file.size > 5 * 1024 * 1024) {  // File Size Validation of 5 MB
        this.registerAgency.controls[attachmentName].setErrors({ fileSizeExceeded: true });
      }
    }
  }

  supportedAttachmentValidator(supportedFormats: string[]) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (control.value === null) {
        return { attachmentRequired: true };
      }

      const attachment: string = control.value;
      const attachmentName = attachment.toLowerCase();
      const attachmentExtension = attachmentName.split('.').pop();

      if (attachmentExtension && !supportedFormats.includes(attachmentExtension)) {
        return { unsupportedFormat: true };
      }

      return null;
    };
  }

  enableEditableFields() {
    this.isEditableForm = true;
  }

  openModal(doc: any) {
    const inBase64 = btoa(doc);
    return `${this.backendApiUrl}/view-document/${inBase64}`
    // this.restService.getMethod(`/view-document/${inBase64}`).subscribe(async (response: Blob) => {
    //   const reader = new FileReader();
    //   reader.onload = () => {
    //     this.documentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(reader.result as string);
    //   };
    //   reader.readAsDataURL(response);
    //   return await this.modalComponent.open();
    // }, (err) => {
    //   Swal.fire({
    //     title: 'Error',
    //     text: err.statusText,
    //     icon: 'error',
    //     confirmButtonText: 'OK'
    //   })
    // })
    // const docPath = await this.user.base_url + doc;
    // this.documentUrl = await this.sanitizer.bypassSecurityTrustResourceUrl(docPath);
    // return await this.modalComponent.open();
  }

  downloadDocument(doc: any) {
    const urlParts = doc.split('/');
    const filenameWithExtension = urlParts[urlParts.length - 1];
    const filenameParts = filenameWithExtension.split('.');
    const extension = filenameParts.pop();
    const filename = filenameParts.join('.');
    this.restService.getMethod(`/view-document/${btoa(doc)}`).subscribe(async (response: Blob) => {
      const blob = new Blob([response], { type: `application/${extension}` });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  }

  totalSubscriptionAmount() {
    let totalAmount: number = 0;
    let sub = this.subscriptionForm.value.subscription.filter((el: any) => el.checked);
    for (var item of sub) {
      const selectedSubscr = this.subscriptionDetails.find((el: any) => el.id == item.id).price;
      let totalCost = (+selectedSubscr) + (selectedSubscr * 15 / 100);
      totalAmount = (totalAmount + totalCost);
    }
    this.totalSubscriptionsAmount = totalAmount;
  }

}
