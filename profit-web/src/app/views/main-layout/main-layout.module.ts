import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MainLayoutComponent } from "./main-layout.component";

@NgModule({
    declarations: [MainLayoutComponent],
    imports: [CommonModule],
    exports: [MainLayoutComponent]
})
export class MainLayoutModule { }