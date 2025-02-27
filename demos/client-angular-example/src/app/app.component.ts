import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="container">
      <h1>Simple Form Demo</h1>
      <form (ngSubmit)="onSubmit()" #demoForm="ngForm">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" class="form-control" id="name" name="name" [(ngModel)]="model.name" required>
        </div>
        
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" class="form-control" id="email" name="email" [(ngModel)]="model.email" required>
        </div>
        
        <button type="submit" [disabled]="!demoForm.form.valid">Submit</button>
      </form>
      
      <div *ngIf="submitted">
        <h2>Form submitted successfully!</h2>
        <p>Name: {{ model.name }}</p>
        <p>Email: {{ model.email }}</p>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
    }
    input {
      width: 100%;
      padding: 8px;
      box-sizing: border-box;
    }
    button {
      padding: 10px 15px;
      background-color: #4CAF50;
      color: white;
      border: none;
      cursor: pointer;
    }
    button:disabled {
      background-color: #cccccc;
    }
  `]
})
export class AppComponent {
  submitted = false;
  
  model = {
    name: '',
    email: ''
  };
  
  onSubmit(): void {
    console.log('Form submitted');
    this.submitted = true;
  }
} 