# Laravel Application Architecture

## Types

Always use strict types in your PHP files by adding `declare(strict_types=1);` at the top of the file. This helps catch type-related bugs early and improves code readability.



## Actions

Actions should be the main way to implement application logic.
Actions should be defined in app/Actions.
They should accept validated data and perform business logic, such as database queries, API calls, sending notifications, etc.
Actions should not be responsible for validation or authorization, and should not be coupled to HTTP or any other transport layer.
Actions should be reusable and composable, and should not have side effects that are not related to their main responsibility.
Actions should return data or throw exceptions, and should not directly manipulate the response or view.

Example of an Action:

```php
<?php

namespace App\Actions;

use App\Models\User;
use Illuminate\Support\Facades\Hash;

class CreateUserAction
{
    public function execute(string $name, string $email, string $password): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
        ]);

        // You can also perform other business logic here, such as sending a welcome email, logging an event, etc.

        return $user;
    }
}
```

## Controllers

Controllers should be a thing layer around Actions.
They should always use custom FormRequests for validation and authorization.
Controllers should be as thin as possible, and should not contain any business logic.

Controllers should be organised using standard Laravel resourceful conventions, and should be defined in app/Http/Controllers.

Example of a Controller:

```php
<?php

namespace App\Http\Controllers;

use App\Actions\CreateUserAction;
use App\Http\Requests\CreateUserRequest;

class UserController extends Controller
{
    public function store(CreateUserRequest $request, CreateUserAction $action)
    {
        $user = $action->execute(
            name: $request->input('name'),
            email: $request->input('email'),
            password: $request->input('password'),
        );

        return response()->json($user, 201);
    }
}
```

## Form Requests

Form Requests should be used for validation and authorization.
They should be defined in app/Http/Requests.
Form Requests should contain all the validation rules and authorization logic for a specific request.
All controller methods accepting user input should use a Form Request, and should not perform any validation or authorization themselves.

Example of a Form Request:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Implement your authorization logic here, such as checking if the user has a specific role or permission.
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ];
    }
}
```

## Models

Models should be defined in app/Models.
Models should represent the data structure of your application, and should contain any relationships, accessors, mutators, and scopes related to that data.
Models should not contain any business logic that is not directly related to the data they represent, such as complex queries or API calls. That logic should be placed in Actions instead.

### Model Relationships

Models can define relationships to other models using Eloquent's relationship methods, such as `hasOne`, `hasMany`, `belongsTo`, and `belongsToMany`. These relationships allow you to easily query related data and perform operations on it.
You should define scoped relationships when you have common query patterns that involve related models. For example, if you have a `User` model and a `Post` model, you might define a `publishedPosts` relationship on the `User` model that only returns posts with a `published_at` date in the past.
When defining relationships, always use docblocks to specify the return type of the relationship method, such as `@return \Illuminate\Database\Eloquent\Relations\HasMany`. This helps with code readability and IDE autocompletion.

Example of a Model:

```php
<?php

namespace App\Models;

use App\Models\Post;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class User extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    // Define any relationships, accessors, mutators, or scopes here.

    /**
     * @return HasMany<Post, $this>
     */
    public function posts()
    {
        return $this->hasMany(Post::class);
    }
}
```

## Authorization

Authorization should be handled using Laravel's Gate and Policy system.
Policies should be defined for each model in app/Policies, and should contain methods that determine if a user is authorized to perform a specific action on that model.
Controllers should use the `Gate::authorize` method to check if the user is authorized to perform the action before executing the corresponding Action.
Policies should also be organised using standard Laravel resource conventions.

Example of a Policy:

```php
<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    public function update(User $user, Post $post): bool
    {
        // Implement your authorization logic here, such as checking if the user is the author of the post or has a specific role or permission.
        return $user->id === $post->user_id;
    }
}
```

### Inertia Authorization

You should attach authorization data to the shared props in your Inertia middleware so that you can easily check permissions on the frontend without having to make additional API calls. This allows you to conditionally render UI elements based on the user's permissions, such as showing or hiding buttons for creating, editing, or deleting resources.

Example of sharing authorization data with Inertia:

```php
<?php

namespace App\Http\Middleware;

use App\Models\Post;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    // ...

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request)
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
                'permissions' => [
                    'post' => [
                        'create' => $request->user()->can('create', Post::class),
                    ],
                ],
            ],
        ];
    }
}
```

## Testing

You should write tests for Actions, Controllers, Models using PestPHP.

Use PestPHP's datasets to test a wide variety of data and hooks to tidy up repeated test set-up and teardown.

### Action Tests

Should test the business logic of the Action, such as database queries, API calls, and other side effects. You can use Laravel's built-in testing tools to mock dependencies and assert that the Action behaves as expected.

Example of an Action test:

```php
<?php

declare(strict_types=1);

use App\Actions\LogActivity;
use App\Models\User;
use App\Models\Vacancy;
use Database\Seeders\ShieldSeeder;
use Spatie\Activitylog\Models\Activity;

beforeEach(function (): void {
    $this->seed(ShieldSeeder::class);
});

test('logs activity with all required parameters', function (): void {
    // arrange
    $user = User::factory()->create();
    $vacancy = Vacancy::factory()->create();
    $event = 'test_event';
    $description = 'Test activity logged';

    // act
    LogActivity::run($user, $vacancy, $event, $description);

    // assert
    $activity = Activity::latest()->first();
    expect($activity->causer_id)->toBe($user->id);
    expect($activity->subject_id)->toBe($vacancy->id);
    expect($activity->subject_type)->toBe(Vacancy::class);
    expect($activity->event)->toBe($event);
    expect($activity->description)->toBe($description);
    expect($activity->properties)->toBeEmpty();
});
```

### Controller Tests

Should test the HTTP layer of your application, such as request validation, authorization, and response formatting. You can use Laravel's HTTP testing tools to make requests to your controllers and assert that they return the expected status codes and response data.

Example of a Controller test:

```php
<?php

declare(strict_types=1);

beforeEach(function (): void {
    Skill::factory(5)->create();
});

test('create method requires auth', function (): void {
    $this->get(route('account-setup.create'))
        ->assertRedirectToRoute('passwordless.create');
});

test('store method requires authenticated user', function (): void {
    $validData = [
        'first_name' => 'John',
        'last_name' => 'Doe',
        'address_street' => '123 Main St',
        'address_city' => 'Anytown',
        'address_postcode' => '12345',
        'date_of_birth' => now()->subYears(25)->format('Y-m-d'),
    ];

    $this->post(route('account-setup.store'), $validData)
        ->assertRedirect(route('passwordless.create'));
});
```

### Model Tests

Should test the data structure of your application, such as relationships, accessors, mutators, and scopes. You can use Laravel's model testing tools to create instances of your models and assert that they behave as expected.

Example of a Model test:

```php
<?php

declare(strict_types=1);

use App\Models\User;
use App\Models\Vacancy;

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->vacancy = Vacancy::factory()->create();
});

test('to array', function (): void {
    $vacancyArray = $this->vacancy->toArray();

    expect($vacancyArray)->toHaveKeys([
        'id',
        'title',
        'description',
        'user_id',
        'created_at',
        'updated_at',
    ]);
});

test('a vacancy belongs to a user', function (): void {
    $this->vacancy->user()->associate($this->user);
    $this->vacancy->save();

    expect($this->vacancy->user)->toBeInstanceOf(User::class);
    expect($this->vacancy->user->id)->toBe($this->user->id);
});
```
