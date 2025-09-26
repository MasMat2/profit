import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MainLayoutComponent } from "./main-layout.component";
import { CategoryPlansComponent } from "../category-plans/category-plans.component";
import { FormsModule } from "@angular/forms";

@NgModule({
    declarations: [MainLayoutComponent, CategoryPlansComponent],
    imports: [CommonModule, FormsModule],
    exports: [MainLayoutComponent]
})
export class MainLayoutModule { }
